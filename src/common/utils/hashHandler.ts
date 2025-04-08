import * as bcrypt from 'bcrypt';

const HashHandler = {
  hashString: async (string: string): Promise<string> =>
    await bcrypt.hash(string, 10),

  compareString: async (
    string: string,
    hashedString: string,
  ): Promise<boolean> => await bcrypt.compare(string, hashedString),
};

export default HashHandler;
