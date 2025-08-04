import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionGateway } from './connection.gateway';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import {
  createMockConfigService,
  createMockSocketServer,
} from 'test/mocks/sockets.mock';

describe('ConnectionGateway', () => {
  let gateway: ConnectionGateway;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionGateway,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();

    gateway = module.get<ConnectionGateway>(ConnectionGateway);
    (gateway as any).server = createMockSocketServer();

    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register initial_headers listener and set CORS headers', () => {
      const mockEngine = { on: jest.fn((event, cb) => cb({})) };

      gateway.server = { engine: mockEngine } as unknown as Server;
      gateway.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith('FRONTEND_URL');
      expect(mockEngine.on).toHaveBeenCalledWith(
        'initial_headers',
        expect.any(Function),
      );
    });
  });

  describe('afterInit', () => {
    it('should log WebSocket server initialized', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.afterInit();
      expect(logSpy).toHaveBeenCalledWith('WebSocket server initialized.');
      logSpy.mockRestore();
    });
  });

  describe('handleConnection', () => {
    it('should log client connection', () => {
      const clientMock = { id: '123' } as any;
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.handleConnection(clientMock);
      expect(logSpy).toHaveBeenCalledWith('Client connected: 123');
      logSpy.mockRestore();
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const clientMock = { id: '123' } as any;
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.handleDisconnect(clientMock);
      expect(logSpy).toHaveBeenCalledWith('Client disconnected: 123');
      logSpy.mockRestore();
    });
  });
});
