export const createMockMethods = <T extends readonly string[]>(
  methods: T,
): Record<T[number], jest.Mock> =>
  Object.fromEntries(methods.map((method) => [method, jest.fn()])) as Record<
    T[number],
    jest.Mock
  >;
