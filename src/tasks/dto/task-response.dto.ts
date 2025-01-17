import { ITask } from '../tasks.interfaces';

export class TaskResponseDto {
  success: boolean;
  task: ITask;
}
