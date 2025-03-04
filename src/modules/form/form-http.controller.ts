import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IFormService } from './form.port';
import { FORM_SERVICE } from './form.id-token';
import { RemoteAuthGuard } from 'src/share/guard';
import { FormCreateDTO } from './form.dto';
import { ReqWithRequester } from 'src/share';

@Controller()
export class FormHttpController {
  constructor(@Inject(FORM_SERVICE) private readonly service: IFormService) {}

  @Post('form-create')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createForm(
    @Request() req: ReqWithRequester,
    @Body() dto: FormCreateDTO,
  ) {
    const { requester } = req;
    return await this.service.createForm(dto, requester.sub);
  }
}
