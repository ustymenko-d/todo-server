import { Server } from 'socket.io';

export const createMockConfigService = () => ({
  get: jest.fn((key: string) => {
    if (key === 'FRONTEND_URL') return 'http://localhost:3000';
    return null;
  }),
});

export const createMockSocketServer = (): Partial<Server> => {
  const mockEngineOn = jest.fn();
  return {
    engine: { on: mockEngineOn },
    emit: jest.fn(),
    except: jest.fn().mockReturnThis(),
    __mock__: {
      engineOn: mockEngineOn,
    },
  } as any as Partial<Server>;
};
