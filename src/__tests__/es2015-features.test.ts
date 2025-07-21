/**
 * Test file to verify ES2015+ (ES6+) features work correctly in the codebase
 * This test demonstrates various ES2015+ features that should be allowed by ESLint
 */

describe('ES2015+ Features Support', () => {
  test('arrow functions work correctly', () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });

  test('const and let declarations work', () => {
    const immutable = 'test';
    let mutable = 'initial';
    mutable = 'changed';

    expect(immutable).toBe('test');
    expect(mutable).toBe('changed');
  });

  test('template literals work correctly', () => {
    const name = 'World';
    const greeting = `Hello, ${name}!`;
    expect(greeting).toBe('Hello, World!');
  });

  test('destructuring assignment works', () => {
    const obj = { x: 1, y: 2, z: 3 };
    const { x, y } = obj;
    const arr = [1, 2, 3];
    const [first, second] = arr;

    expect(x).toBe(1);
    expect(y).toBe(2);
    expect(first).toBe(1);
    expect(second).toBe(2);
  });

  test('spread operator works', () => {
    const arr1 = [1, 2, 3];
    const arr2 = [...arr1, 4, 5];
    const obj1 = { a: 1, b: 2 };
    const obj2 = { ...obj1, c: 3 };

    expect(arr2).toEqual([1, 2, 3, 4, 5]);
    expect(obj2).toEqual({ a: 1, b: 2, c: 3 });
  });

  test('default parameters work', () => {
    const greet = (name = 'Anonymous') => `Hello, ${name}!`;
    expect(greet()).toBe('Hello, Anonymous!');
    expect(greet('John')).toBe('Hello, John!');
  });

  test('classes work correctly', () => {
    class TestClass {
      private value: number;

      constructor(initialValue = 0) {
        this.value = initialValue;
      }

      getValue(): number {
        return this.value;
      }

      increment(): void {
        this.value++;
      }
    }

    const instance = new TestClass(5);
    expect(instance.getValue()).toBe(5);
    instance.increment();
    expect(instance.getValue()).toBe(6);
  });

  test('for...of loops work', () => {
    const numbers = [1, 2, 3, 4, 5];
    const doubled: number[] = [];

    for (const num of numbers) {
      doubled.push(num * 2);
    }

    expect(doubled).toEqual([2, 4, 6, 8, 10]);
  });

  test('Map and Set work correctly', () => {
    const map = new Map([['key1', 'value1'], ['key2', 'value2']]);
    const set = new Set([1, 2, 3, 2, 1]);

    expect(map.get('key1')).toBe('value1');
    expect(set.size).toBe(3);
    expect(Array.from(set)).toEqual([1, 2, 3]);
  });

  test('Promises work correctly', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('resolved'), 10);
    });

    const result = await promise;
    expect(result).toBe('resolved');
  });

  test('async/await syntax works', async () => {
    const fetchData = async (): Promise<string> => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('data'), 10);
      });
    };

    const data = await fetchData();
    expect(data).toBe('data');
  });

  test('object shorthand property works', () => {
    const name = 'test';
    const value = 42;
    const obj = { name, value };

    expect(obj).toEqual({ name: 'test', value: 42 });
  });

  test('computed property names work', () => {
    const key = 'dynamic';
    const obj = {
      [key]: 'value',
      [`${key}2`]: 'value2'
    };

    expect(obj.dynamic).toBe('value');
    expect(obj.dynamic2).toBe('value2');
  });
});