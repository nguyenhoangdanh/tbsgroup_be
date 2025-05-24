import { Module } from '@nestjs/common';
import { ShareModule } from 'src/share/module';
import { DepartmentProviders } from './department-adapter';
import { DepartmentHttpController } from './department-http.controller';

@Module({
  imports: [ShareModule],
  controllers: [DepartmentHttpController],
  providers: [...DepartmentProviders],
  exports: [...DepartmentProviders],
})
export class DepartmentModule {}
