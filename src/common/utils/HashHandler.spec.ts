import * as bcrypt from 'bcrypt';
import HashHandler from './HashHandler';

jest.mock('bcrypt');

const hashMock = bcrypt.hash as unknown as jest.Mock;
const compareMock = bcrypt.compare as unknown as jest.Mock;

describe('HashHandler Utility', () => {
  const plain = 'mySecret123';
  const fakeHash = '$2b$10$abcdefghijklmnopqrstuv';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashString', () => {
    it('calls bcrypt.hash with correct parameters and returns hashed string', async () => {
      hashMock.mockResolvedValue(fakeHash);

      const result = await HashHandler.hashString(plain);

      expect(hashMock).toHaveBeenCalledWith(plain, 10);
      expect(result).toBe(fakeHash);
    });
  });

  describe('compareString', () => {
    it('should return true when strings match', async () => {
      compareMock.mockResolvedValue(true);

      const isMatch = await HashHandler.compareString(plain, fakeHash);

      expect(compareMock).toHaveBeenCalledWith(plain, fakeHash);
      expect(isMatch).toBe(true);
    });

    it('should return false when strings do not match', async () => {
      compareMock.mockResolvedValue(false);

      const isMatch = await HashHandler.compareString(plain, fakeHash);

      expect(compareMock).toHaveBeenCalledWith(plain, fakeHash);
      expect(isMatch).toBe(false);
    });
  });
});
