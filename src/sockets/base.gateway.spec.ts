import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import { BaseGateway } from './base.gateway';

class TestGateway extends BaseGateway {
  public emitToAllExceptInitiator<T>(
    event: string,
    data: T,
    initiatorSocketId?: string,
  ) {
    return super.emitToAllExceptInitiator(event, data, initiatorSocketId);
  }

  public emitEntityEvent<T>(
    entity: string,
    action: string,
    payload: T,
    initiatorSocketId?: string,
  ) {
    return super.emitEntityEvent(entity, action, payload, initiatorSocketId);
  }
}

describe('BaseGateway', () => {
  let gateway: TestGateway;
  let configService: ConfigService;

  // Єдиний mockServer — буде підставлений і протестований
  let mockServer: Partial<Server> & {
    engine: { on: jest.Mock };
    emit: jest.Mock;
    except: jest.Mock;
  };

  beforeEach(async () => {
    (mockServer as any) = {
      engine: {
        on: jest.fn(),
      },
      emit: jest.fn(),
      except: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'FRONTEND_URL' ? 'http://localhost:3000' : null,
            ),
          },
        },
        TestGateway,
      ],
    }).compile();

    gateway = module.get(TestGateway);
    configService = module.get(ConfigService);

    // Підставляємо наш мок
    (gateway as any).server = mockServer as any as Server;
  });

  describe('onModuleInit', () => {
    it('should register CORS headers using engine.on', () => {
      gateway.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith('FRONTEND_URL');
      expect(mockServer.engine.on).toHaveBeenCalledWith(
        'initial_headers',
        expect.any(Function),
      );

      // Імітація виклику callback-а для headers
      const headers: Record<string, string> = {};
      const cb = mockServer.engine.on.mock.calls[0][1];
      cb(headers);

      expect(headers['Access-Control-Allow-Origin']).toBe(
        'http://localhost:3000',
      );
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });
  });

  describe('emitToAllExceptInitiator', () => {
    it('should emit to all except initiator if ID provided', () => {
      gateway.emitToAllExceptInitiator('test:event', { foo: 1 }, 'socket123');
      expect(mockServer.except).toHaveBeenCalledWith('socket123');
      expect(mockServer.emit).toHaveBeenCalledWith('test:event', { foo: 1 });
    });

    it('should emit to all if no initiator ID', () => {
      gateway.emitToAllExceptInitiator('test:event', { bar: 2 });
      expect(mockServer.emit).toHaveBeenCalledWith('test:event', { bar: 2 });
    });
  });

  describe('emitEntityEvent', () => {
    it('should emit formatted event with payload and initiator', () => {
      gateway.emitEntityEvent('user', 'update', { id: 1 }, 'socket123');
      expect(mockServer.except).toHaveBeenCalledWith('socket123');
      expect(mockServer.emit).toHaveBeenCalledWith('user:update', { id: 1 });
    });

    it('should emit formatted event without initiator', () => {
      gateway.emitEntityEvent('message', 'create', { text: 'Hi' });
      expect(mockServer.emit).toHaveBeenCalledWith('message:create', {
        text: 'Hi',
      });
    });
  });
});
