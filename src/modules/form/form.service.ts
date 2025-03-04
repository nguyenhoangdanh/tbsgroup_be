import { Inject, Injectable } from '@nestjs/common';
import { IFormRepository, IFormService } from './form.port';
import { FORM_REPOSITORY } from './form.id-token';
import { FormCreateDTO } from './form.dto';
import { IFormSettingRepository } from '../formSettings/form-settings.port';
import { defaultBackgroundColor, defaultPrimaryColor } from 'src/constant';
import { FORM_SETTINGS_REPOSITORY } from '../formSettings/form-settings.id-token';
import { PromiseReturnData } from 'src/interface/common.interface';

@Injectable()
export class FormService implements IFormService {
  constructor(
    @Inject(FORM_REPOSITORY)
    private readonly repository: IFormRepository,
    @Inject(FORM_SETTINGS_REPOSITORY)
    private readonly formSettingsRepository: IFormSettingRepository,
  ) {}
  async createForm(dto: FormCreateDTO, userId: string) {
    // const form = await this.repository.findByCond({
    //   name: dto.name,
    // });

    // if (form) {
    //   throw new Error('Form already exists');
    // }

    const formSettings = await this.formSettingsRepository.insert({
      primaryColor: defaultPrimaryColor,
      backgroundColor: defaultBackgroundColor,
    });

    const newForm = await this.repository.insert(dto, userId, formSettings.id);
    if (!newForm) {
      throw new Error('Create form failed');
    }

    return PromiseReturnData({
      data: newForm,
      message: 'Create form successfully',
      success: true,
    });
  }

  //   async updateForm(id: string, dto: FormCreateDTO) {
  //     // return this.repository.updateForm(id, dto); }
  //   }

  //   async deleteForm(id: string) {
  //     // return this.repository.deleteForm(id);
  //   }

  //   async publishForm(formId: string, published: boolean): Promise<void> {
  //     // return this.repository.publishForm(formId, published);
  //   }
}
