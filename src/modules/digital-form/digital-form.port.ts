import { Requester } from 'src/share';
import {
  DigitalFormCondDTO,
  DigitalFormCreateDTO,
  DigitalFormEntryDTO,
  DigitalFormSubmitDTO,
  DigitalFormUpdateDTO,
  PaginationDTO,
} from './digital-form.dto';
import { DigitalForm, DigitalFormEntry } from './digital-form.model';

// Interface for digital form repository
export interface IDigitalFormRepository {
  // Form methods
  getDigitalForm(id: string): Promise<DigitalForm | null>;
  insertDigitalForm(form: DigitalForm): Promise<void>;
  updateDigitalForm(id: string, dto: Partial<DigitalForm>): Promise<void>;
  deleteDigitalForm(id: string): Promise<void>;
  listDigitalForms(
    conditions: DigitalFormCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: DigitalForm[];
    total: number;
  }>;

  // Form entry methods
  listDigitalFormEntries(formId: string): Promise<DigitalFormEntry[]>;
  findFormEntry(
    formId: string,
    userId: string,
    handBagId: string,
    bagColorId: string,
    processId: string,
  ): Promise<DigitalFormEntry | null>;
  insertFormEntry(entry: DigitalFormEntry): Promise<void>;
  updateFormEntry(id: string, dto: Partial<DigitalFormEntry>): Promise<void>;
  deleteFormEntry(id: string): Promise<void>;

  // Utility methods
  getLineCode(lineId: string): Promise<string>;
}

// Interface for digital form service
export interface IDigitalFormService {
  // Form methods
  createDigitalForm(
    requester: Requester,
    dto: DigitalFormCreateDTO,
  ): Promise<string>;

  getDigitalForm(id: string): Promise<DigitalForm>;

  getDigitalFormWithEntries(id: string): Promise<{
    form: DigitalForm;
    entries: DigitalFormEntry[];
  }>;

  updateDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormUpdateDTO,
  ): Promise<void>;

  deleteDigitalForm(requester: Requester, id: string): Promise<void>;

  listDigitalForms(
    conditions: DigitalFormCondDTO,
    pagination: PaginationDTO,
  ): Promise<{
    data: DigitalForm[];
    total: number;
    page: number;
    limit: number;
  }>;

  // Form entry methods
  addFormEntry(
    requester: Requester,
    formId: string,
    dto: DigitalFormEntryDTO,
  ): Promise<string>;

  deleteFormEntry(
    requester: Requester,
    formId: string,
    entryId: string,
  ): Promise<void>;

  // Form workflow methods
  submitDigitalForm(
    requester: Requester,
    id: string,
    dto: DigitalFormSubmitDTO,
  ): Promise<void>;

  approveDigitalForm(requester: Requester, id: string): Promise<void>;

  rejectDigitalForm(requester: Requester, id: string): Promise<void>;
}
