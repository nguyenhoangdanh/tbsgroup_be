import { Form } from '@prisma/client';
import { FormCreateDTO, FormUpdateDTO } from './form.dto';
import { PromiseReturnDataType } from 'src/interface/common.interface';

export interface IFormService {
  createForm(dto: FormCreateDTO, userId: string): PromiseReturnDataType<Form>;
  // updateForm(dto: FormUpdateDTO): Promise<void>;
  // deleteForm(formId: string): Promise<void>;
  // publishForm(formId: string, published: boolean): Promise<void>;
  // fetchFormById(formId: string): Promise<FormWithSettings | null>;
  // fetchFormList(): Promise<FormWithSettings[]>;
  // fetchFormListByIds(ids: string[]): Promise<FormWithSettings[]>;
}
export interface IFormRepository {
  get(id: string): Promise<Form | null>;
  findByCond(cond: Partial<FormCreateDTO>): Promise<Form | null>;
  listByIds(ids: string[]): Promise<Form[]>;
  insert(form: FormCreateDTO, userId: string, formId: number): Promise<Form>;
  update(id: string, dto: FormUpdateDTO): Promise<void>;
  delete(id: string, isHard: boolean): Promise<void>;
}
