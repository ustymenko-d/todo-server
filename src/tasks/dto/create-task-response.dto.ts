import { ITask } from '../tasks.interfaces';

export class CreateTaskResponseDto {
  success: boolean;
  task: ITask;
}
