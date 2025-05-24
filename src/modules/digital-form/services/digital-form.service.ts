import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DigitalProductionForm, RecordStatus, ShiftType } from '@prisma/client';
import { PrismaService } from 'src/share/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { UpdateDigitalFormDto } from '../dto/update-digital-form.dto';
import { CreateDigitalFormDto } from '../dto/create-digital-form.dto';

@Injectable()
export class DigitalFormService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new digital production form
   */
  async create(
    dto: CreateDigitalFormDto,
    userId: string,
  ): Promise<DigitalProductionForm> {
    // Validate relationships
    await this.validateRelationships(dto);

    // Generate a form code
    const formCode = await this.generateFormCode(dto.factoryId);

    // Create the form
    const form = await this.prisma.digitalProductionForm.create({
      data: {
        id: uuidv4(),
        formCode,
        formName: dto.formName,
        description: dto.description,
        date: new Date(dto.date),
        shiftType: dto.shiftType as ShiftType,
        factoryId: dto.factoryId,
        lineId: dto.lineId,
        teamId: dto.teamId,
        groupId: dto.groupId,
        userId: dto.userId, // The worker whose form this is
        createdById: userId, // The admin/manager who creates the form
        status: RecordStatus.DRAFT,
      },
    });

    // If workers array is provided, create entries for each worker
    if (dto.workers && dto.workers.length > 0) {
      await this.createFormEntries(form.id, dto);
    }

    return form;
  }

  /**
   * Find all digital forms with filtering options
   */
  async findAll(params: {
    factoryId?: string;
    lineId?: string;
    teamId?: string;
    groupId?: string;
    date?: Date;
    status?: RecordStatus;
    skip?: number;
    take?: number;
  }) {
    const {
      factoryId,
      lineId,
      teamId,
      groupId,
      date,
      status,
      skip = 0,
      take = 10,
    } = params;

    const where: any = {};

    // Apply filters if provided
    if (factoryId) where.factoryId = factoryId;
    if (lineId) where.lineId = lineId;
    if (teamId) where.teamId = teamId;
    if (groupId) where.groupId = groupId;
    if (status) where.status = status;

    // Date filter
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Get forms with counts of entries
    const forms = await this.prisma.digitalProductionForm.findMany({
      where,
      skip,
      take,
      include: {
        factory: {
          select: {
            name: true,
            code: true,
          },
        },
        line: {
          select: {
            name: true,
            code: true,
          },
        },
        team: {
          select: {
            name: true,
            code: true,
          },
        },
        group: {
          select: {
            name: true,
            code: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
        _count: {
          select: {
            entries: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    // Get total count
    const total = await this.prisma.digitalProductionForm.count({ where });

    return {
      data: forms,
      meta: {
        total,
        skip,
        take,
      },
    };
  }

  /**
   * Find a single digital form by ID with all entries
   */
  async findOne(id: string) {
    const form = await this.prisma.digitalProductionForm.findUnique({
      where: { id },
      include: {
        factory: true,
        line: true,
        team: true,
        group: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
        updater: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
        entries: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
              },
            },
            handBag: true,
            bagColor: true,
            process: true,
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(`Digital form with ID ${id} not found`);
    }

    return form;
  }

  /**
   * Update a digital form
   */
  async update(id: string, dto: UpdateDigitalFormDto, userId: string) {
    // Check if form exists
    const existingForm = await this.prisma.digitalProductionForm.findUnique({
      where: { id },
    });

    if (!existingForm) {
      throw new NotFoundException(`Digital form with ID ${id} not found`);
    }

    // Check if form is in a state that allows updates
    if (
      existingForm.status !== RecordStatus.DRAFT &&
      existingForm.status !== RecordStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot update form in ${existingForm.status} status`,
      );
    }

    // Update the form
    const updatedForm = await this.prisma.digitalProductionForm.update({
      where: { id },
      data: {
        formName: dto.formName,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        shiftType: dto.shiftType as ShiftType,
        factoryId: dto.factoryId,
        lineId: dto.lineId,
        teamId: dto.teamId,
        groupId: dto.groupId,
        updatedById: userId,
      },
    });

    return updatedForm;
  }

  /**
   * Delete a digital form
   */
  async remove(id: string) {
    // Check if form exists
    const existingForm = await this.prisma.digitalProductionForm.findUnique({
      where: { id },
    });

    if (!existingForm) {
      throw new NotFoundException(`Digital form with ID ${id} not found`);
    }

    // Check if form is in a state that allows deletion
    if (
      existingForm.status !== RecordStatus.DRAFT &&
      existingForm.status !== RecordStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot delete form in ${existingForm.status} status`,
      );
    }

    // Delete all form entries first
    await this.prisma.productionFormEntry.deleteMany({
      where: { formId: id },
    });

    // Then delete the form
    await this.prisma.digitalProductionForm.delete({
      where: { id },
    });

    return { success: true, message: 'Form deleted successfully' };
  }

  /**
   * Submit a form for approval
   */
  async submitForApproval(id: string, userId: string) {
    // Check if form exists
    const form = await this.prisma.digitalProductionForm.findUnique({
      where: { id },
      include: {
        entries: true,
      },
    });

    if (!form) {
      throw new NotFoundException(`Digital form with ID ${id} not found`);
    }

    // Check if form is in draft status
    if (form.status !== RecordStatus.DRAFT) {
      throw new BadRequestException(
        `Form must be in DRAFT status to submit, current status: ${form.status}`,
      );
    }

    // Check if form has entries
    if (form.entries.length === 0) {
      throw new BadRequestException(
        'Cannot submit an empty form. Please add entries first.',
      );
    }

    // Update the form status
    const updatedForm = await this.prisma.digitalProductionForm.update({
      where: { id },
      data: {
        status: RecordStatus.PENDING,
        submitTime: new Date(),
      },
    });

    // TODO: Create approval request based on workflow
    // This would be implemented when the approval workflow is set up

    return updatedForm;
  }

  /**
   * Generate a form code based on factory and current date
   */
  private async generateFormCode(factoryId: string): Promise<string> {
    // Get factory code
    const factory = await this.prisma.factory.findUnique({
      where: { id: factoryId },
      select: { code: true },
    });

    if (!factory) {
      throw new NotFoundException(`Factory with ID ${factoryId} not found`);
    }

    // Get today's date string
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    // Count existing forms for this factory today
    const formCount = await this.prisma.digitalProductionForm.count({
      where: {
        factoryId,
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lte: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });

    // Generate the sequential number
    const sequentialNum = (formCount + 1).toString().padStart(3, '0');

    // Combine to create form code: FACTORY-YYYYMMDD-XXX
    return `${factory.code}-${dateStr}-${sequentialNum}`;
  }

  /**
   * Validate that all relationships exist in the database
   */
  private async validateRelationships(dto: CreateDigitalFormDto) {
    // Check factory exists
    const factory = await this.prisma.factory.findUnique({
      where: { id: dto.factoryId },
    });

    if (!factory) {
      throw new NotFoundException(`Factory with ID ${dto.factoryId} not found`);
    }

    // Check line exists
    const line = await this.prisma.line.findUnique({
      where: { id: dto.lineId },
    });

    if (!line) {
      throw new NotFoundException(`Line with ID ${dto.lineId} not found`);
    }

    // Check line belongs to factory
    if (line.factoryId !== dto.factoryId) {
      throw new BadRequestException(
        `Line ${dto.lineId} does not belong to factory ${dto.factoryId}`,
      );
    }

    // Check team exists
    const team = await this.prisma.team.findUnique({
      where: { id: dto.teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${dto.teamId} not found`);
    }

    // Check team belongs to line
    if (team.lineId !== dto.lineId) {
      throw new BadRequestException(
        `Team ${dto.teamId} does not belong to line ${dto.lineId}`,
      );
    }

    // Check group exists
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${dto.groupId} not found`);
    }

    // Check group belongs to team
    if (group.teamId !== dto.teamId) {
      throw new BadRequestException(
        `Group ${dto.groupId} does not belong to team ${dto.teamId}`,
      );
    }
  }

  /**
   * Create form entries for each worker
   */
  private async createFormEntries(formId: string, dto: CreateDigitalFormDto) {
    // For each worker, create entries for the selected processes
    if (!dto.workers || dto.workers.length === 0) {
      return; // Skip if no workers defined
    }

    for (const worker of dto.workers) {
      // Validate worker exists
      const userExists = await this.prisma.user.findUnique({
        where: { id: worker.userId },
      });

      if (!userExists) {
        throw new NotFoundException(`User with ID ${worker.userId} not found`);
      }

      // Create entries for each process
      for (const processEntry of worker.processes) {
        // Validate bag exists
        const bagExists = await this.prisma.handBag.findUnique({
          where: { id: processEntry.handBagId },
        });

        if (!bagExists) {
          throw new NotFoundException(
            `HandBag with ID ${processEntry.handBagId} not found`,
          );
        }

        // Validate color exists
        const colorExists = await this.prisma.bagColor.findUnique({
          where: { id: processEntry.bagColorId },
        });

        if (!colorExists) {
          throw new NotFoundException(
            `BagColor with ID ${processEntry.bagColorId} not found`,
          );
        }

        // Validate process exists
        const processExists = await this.prisma.bagProcess.findUnique({
          where: { id: processEntry.processId },
        });

        if (!processExists) {
          throw new NotFoundException(
            `BagProcess with ID ${processEntry.processId} not found`,
          );
        }

        // Create form entry
        await this.prisma.productionFormEntry.create({
          data: {
            id: uuidv4(),
            formId,
            userId: worker.userId,
            handBagId: processEntry.handBagId,
            bagColorId: processEntry.bagColorId,
            processId: processEntry.processId,
            plannedOutput: processEntry.plannedOutput || 0,
            hourlyData: {},
            totalOutput: 0,
          },
        });
      }
    }
  }
}
