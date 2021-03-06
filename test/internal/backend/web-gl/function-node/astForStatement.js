const { assert, test, module: describe, only } = require('qunit');
const { WebGLFunctionNode } = require(process.cwd() + '/src');

describe('WebGLFunctionNode.astForStatement()');

test('with safe loop with init', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const sum = 0;
    for (let i = 0;i < 100; i++) {
      sum++;
    }
    return sum;
  }`, {
    output: [1]
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nfloat user_sum=0.0;'
    + '\nfor (int user_i=0;(user_i<100);user_i++){'
    + '\nuser_sum++;}'
    + '\n'
    + '\nreturn user_sum;'
    + '\n}');
});

test('with safe loop with no init', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const sum = 0;
    const i = 0;
    for (;i < 100; i++) {
      sum++;
    }
    return sum;
  }`, {
    output: [1]
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nfloat user_sum=0.0;'
    + '\nfloat user_i=0.0;'
    + '\nfor (int safeI=0;safeI<LOOP_MAX;safeI++){'
    + '\nif (!(int(user_i)<100)) break;' // <-- casted here to int for compatibility
    + '\nuser_sum++;'
    + '\nuser_i++;}'
    + '\n'
    + '\nreturn user_sum;'
    + '\n}');
});

test('with safe loop with no test', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const sum = 0;
    for (let i = 0;; i++) {
      if (i > 100) break;
      sum++;
    }
    return sum;
  }`, {
    output: [1]
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nfloat user_sum=0.0;'
    + '\nint user_i=0;'
    + '\nfor (int safeI=0;safeI<LOOP_MAX;safeI++){'
    + '\nif ((user_i>100)) {'
    + '\nbreak;'
    + '\n}'
    + '\nuser_sum++;'
    + '\nuser_i++;}'
    + '\n'
    + '\nreturn user_sum;'
    + '\n}');
});

test('with unsafe loop with init', () => {
  const node = new WebGLFunctionNode(`function kernel(arg1) {
    let sum = 0;
    for (let i = 0 + arg1;i < 100; i++) {
      sum++;
    }
    return sum;
  }`, {
    output: [1],
    argumentTypes: ['Number']
  });

  assert.equal(node.toString(), 'float kernel(float user_arg1) {'
    + '\nfloat user_sum=0.0;'
    + '\nint user_i=(0+int(user_arg1));'
    + '\nfor (int safeI=0;safeI<LOOP_MAX;safeI++){'
    + '\nif (!(user_i<100)) break;'
    + '\nuser_sum++;'
    + '\nuser_i++;}'
    + '\n'
    + '\nreturn user_sum;'
    + '\n}');
});

test('with unsafe loop with no init', () => {
  const node = new WebGLFunctionNode(`function kernel(arg1) {
    const sum = 0;
    const i = 0 + arg1;
    for (;i < 100; i++) {
      sum++;
    }
    return sum;
  }`, {
    output: [1],
    argumentTypes: ['Number']
  });

  assert.equal(node.toString(), 'float kernel(float user_arg1) {'
    + '\nfloat user_sum=0.0;'
    + '\nfloat user_i=(0.0+user_arg1);'
    + '\nfor (int safeI=0;safeI<LOOP_MAX;safeI++){'
    + '\nif (!(int(user_i)<100)) break;'
    + '\nuser_sum++;'
    + '\nuser_i++;}'
    + '\n'
    + '\nreturn user_sum;'
    + '\n}');
});

test('with unsafe loop with no init reversed', () => {
  const node = new WebGLFunctionNode(`function kernel(arg1) {
    const sum = 0;
    const i = 0 + arg1;
    for (;100 > i; i++) {
      sum++;
    }
    return sum;
  }`, {
    output: [1],
    argumentTypes: ['Number']
  });

  assert.equal(node.toString(), 'float kernel(float user_arg1) {'
    + '\nfloat user_sum=0.0;'
    + '\nfloat user_i=(0.0+user_arg1);'
    + '\nfor (int safeI=0;safeI<LOOP_MAX;safeI++){'
    + '\nif (!(100>int(user_i))) break;'
    + '\nuser_sum++;'
    + '\nuser_i++;}'
    + '\n'
    + '\nreturn user_sum;'
    + '\n}');
});


test('nested safe loop', () => {
  const node = new WebGLFunctionNode(`function kernel() {
    const sum = 0;
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 100; j++) {
        sum++;
      }
    }
    return sum;
  }`, {
    output: [1]
  });

  assert.equal(node.toString(), 'float kernel() {'
    + '\nfloat user_sum=0.0;'
    + '\nfor (int user_i=0;(user_i<100);user_i++){'
    + '\nfor (int user_j=0;(user_j<100);user_j++){'
    + '\nuser_sum++;}'
    + '\n}'
    + '\n'
    + '\nreturn user_sum;'
    + '\n}');
});

test('nested unsafe loop', () => {
  const node = new WebGLFunctionNode(`function kernel(arg1, arg2) {
    const sum = 0;
    for (let i = arg1; i < 100; i++) {
      for (let j = arg2; j < 100; j++) {
        sum++;
      }
    }
    return sum;
  }`, {
    argumentTypes: ['Number', 'Number'],
    output: [1]
  });

  assert.equal(node.toString(), 'float kernel(float user_arg1, float user_arg2) {'
    + '\nfloat user_sum=0.0;'
    + '\nint user_i=int(user_arg1);'
    + '\nfor (int safeI2=0;safeI2<LOOP_MAX;safeI2++){'
    + '\nif (!(user_i<100)) break;'
    + '\nint user_j=int(user_arg2);'
    + '\nfor (int safeI=0;safeI<LOOP_MAX;safeI++){'
    + '\nif (!(user_j<100)) break;'
    + '\nuser_sum++;'
    + '\nuser_j++;}'
    + '\n'
    + '\nuser_i++;}'
    + '\n'
    + '\nreturn user_sum;'
    + '\n}');
});
