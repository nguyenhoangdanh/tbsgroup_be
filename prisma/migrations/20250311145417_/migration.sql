-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'INACTIVE', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('REGULAR', 'EXTENDED', 'OVERTIME');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'LEAVE_APPROVED');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'PRODUCTION', 'ATTENDANCE', 'LEAVE_REQUEST', 'APPROVAL');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionIssueType" AS ENUM ('ABSENT', 'LATE', 'WAITING_MATERIALS', 'QUALITY_ISSUES', 'LOST_MATERIALS', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "card_id" VARCHAR(50) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(100) NOT NULL,
    "salt" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "avatar" VARCHAR(255),
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "default_role_id" UUID,
    "factory_id" UUID,
    "line_id" UUID,
    "team_id" UUID,
    "group_id" UUID,
    "position_id" UUID,
    "last_login" TIMESTAMP(0),
    "password_reset_token" VARCHAR(100),
    "password_reset_expiry" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "scope" VARCHAR(50),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "level" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factory_managers" (
    "factory_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "factory_managers_pkey" PRIMARY KEY ("factory_id","user_id")
);

-- CreateTable
CREATE TABLE "line_managers" (
    "line_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "line_managers_pkey" PRIMARY KEY ("line_id","user_id")
);

-- CreateTable
CREATE TABLE "team_leaders" (
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "team_leaders_pkey" PRIMARY KEY ("team_id","user_id")
);

-- CreateTable
CREATE TABLE "group_leaders" (
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "group_leaders_pkey" PRIMARY KEY ("group_id","user_id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "skill_level" INTEGER,
    "category" VARCHAR(100),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bag_processes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "standard_output" INTEGER NOT NULL DEFAULT 0,
    "cycle_duration" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "bag_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_processes" (
    "position_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "efficiency" DOUBLE PRECISION DEFAULT 1.0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_processes_pkey" PRIMARY KEY ("position_id","process_id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_departments" (
    "user_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "user_departments_pkey" PRIMARY KEY ("user_id","department_id")
);

-- CreateTable
CREATE TABLE "factories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "address" VARCHAR(255),
    "department_id" UUID,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "factories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "factory_id" UUID NOT NULL,
    "capacity" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "line_id" UUID NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "team_id" UUID NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hand_bags" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "image_url" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" VARCHAR(100),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "hand_bags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bag_process_hand_bags" (
    "bag_process_id" UUID NOT NULL,
    "hand_bag_id" UUID NOT NULL,
    "standard_output" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bag_process_hand_bags_pkey" PRIMARY KEY ("bag_process_id","hand_bag_id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "type" "ShiftType" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "check_in_time" TIMESTAMP(0),
    "check_out_time" TIMESTAMP(0),
    "reason" VARCHAR(255),
    "approved_by" UUID,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(0),
    "attachments" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sender_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(0),
    "entity_id" UUID,
    "entity_type" VARCHAR(50),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "submitter_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "submitted_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(0),
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_issues" (
    "id" UUID NOT NULL,
    "production_record_id" UUID NOT NULL,
    "issue_type" "ProductionIssueType" NOT NULL,
    "description" TEXT,
    "affected_hour" INTEGER,
    "impact_percentage" INTEGER,
    "start_time" TIMESTAMP(0),
    "end_time" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "production_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_process_forms" (
    "id" UUID NOT NULL,
    "form_number" VARCHAR(50) NOT NULL,
    "date" DATE NOT NULL,
    "shift_type" "ShiftType" NOT NULL,
    "printed_by" UUID NOT NULL,
    "printed_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMP(0),
    "verified_by" UUID,
    "verified_at" TIMESTAMP(0),
    "status" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "production_process_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bag_process_id" UUID NOT NULL,
    "hand_bag_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "total_output" INTEGER NOT NULL,
    "reason" VARCHAR(255),
    "status" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(0),
    "form_id" UUID,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "production_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_hourly_data" (
    "id" UUID NOT NULL,
    "production_record_id" UUID NOT NULL,
    "hour" INTEGER NOT NULL,
    "output" INTEGER NOT NULL,
    "quality_issues" INTEGER DEFAULT 0,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_hourly_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_production_forms" (
    "id" UUID NOT NULL,
    "form_code" VARCHAR(50) NOT NULL,
    "form_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "shift_type" "ShiftType" NOT NULL,
    "line_id" UUID NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMP(0) NOT NULL,
    "submit_time" TIMESTAMP(0),
    "approval_request_id" UUID,
    "approved_at" TIMESTAMP(0),
    "is_exported" BOOLEAN NOT NULL DEFAULT false,
    "sync_status" VARCHAR(50),

    CONSTRAINT "digital_production_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_form_entries" (
    "id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "hand_bag_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "hourly_data" JSONB NOT NULL DEFAULT '{}',
    "total_output" INTEGER NOT NULL DEFAULT 0,
    "attendance_status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "check_in_time" TIMESTAMP(0),
    "check_out_time" TIMESTAMP(0),
    "attendance_note" VARCHAR(255),
    "issues" JSONB,
    "quality_score" INTEGER DEFAULT 100,
    "quality_notes" VARCHAR(255),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "production_form_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_workflows" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "entity_type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_workflow_steps" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "approver_type" VARCHAR(50) NOT NULL,
    "approver_role_id" UUID,
    "approver_user_id" UUID,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_start" BOOLEAN NOT NULL DEFAULT true,
    "can_reject" BOOLEAN NOT NULL DEFAULT true,
    "timeout_hours" INTEGER,
    "escalation_user_id" UUID,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "approval_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_signatures" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "approval_request_id" UUID,
    "signature_hash" VARCHAR(255) NOT NULL,
    "signed_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "device_info" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL,
    "revoked_at" TIMESTAMP(0),
    "revoked_by" UUID,
    "comment" VARCHAR(255),

    CONSTRAINT "digital_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "total_days" DOUBLE PRECISION NOT NULL,
    "used_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "leave_request_id" UUID NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "date" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "status" "LeaveStatus" NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "leave_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "description" VARCHAR(255),
    "is_full_day" BOOLEAN NOT NULL DEFAULT true,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_exports" (
    "id" UUID NOT NULL,
    "export_type" VARCHAR(50) NOT NULL,
    "parameters" JSONB,
    "file_path" VARCHAR(255),
    "file_format" VARCHAR(10) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "line_id" UUID,
    "created_by_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(0),

    CONSTRAINT "data_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "report_type" VARCHAR(50) NOT NULL,
    "report_format" VARCHAR(10) NOT NULL DEFAULT 'PDF',
    "schedule" VARCHAR(50),
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "last_run_at" TIMESTAMP(0),
    "next_run_at" TIMESTAMP(0),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_card_id_key" ON "users"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_user_status" ON "users"("status");

-- CreateIndex
CREATE INDEX "idx_user_employee_id" ON "users"("employee_id");

-- CreateIndex
CREATE INDEX "idx_user_hierarchy" ON "users"("factory_id", "line_id", "team_id", "group_id");

-- CreateIndex
CREATE INDEX "idx_user_position_id" ON "users"("position_id");

-- CreateIndex
CREATE INDEX "idx_user_role_assignment_user" ON "user_role_assignments"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_role_assignment_role" ON "user_role_assignments"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_role_scope" ON "user_role_assignments"("user_id", "role_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "idx_role_level" ON "roles"("level");

-- CreateIndex
CREATE INDEX "idx_factory_manager_factory" ON "factory_managers"("factory_id");

-- CreateIndex
CREATE INDEX "idx_factory_manager_user" ON "factory_managers"("user_id");

-- CreateIndex
CREATE INDEX "idx_line_manager_line" ON "line_managers"("line_id");

-- CreateIndex
CREATE INDEX "idx_line_manager_user" ON "line_managers"("user_id");

-- CreateIndex
CREATE INDEX "idx_team_leader_team" ON "team_leaders"("team_id");

-- CreateIndex
CREATE INDEX "idx_team_leader_user" ON "team_leaders"("user_id");

-- CreateIndex
CREATE INDEX "idx_group_leader_group" ON "group_leaders"("group_id");

-- CreateIndex
CREATE INDEX "idx_group_leader_user" ON "group_leaders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "positions_code_key" ON "positions"("code");

-- CreateIndex
CREATE INDEX "idx_position_category" ON "positions"("category");

-- CreateIndex
CREATE INDEX "idx_position_skill_level" ON "positions"("skill_level");

-- CreateIndex
CREATE UNIQUE INDEX "bag_processes_code_key" ON "bag_processes"("code");

-- CreateIndex
CREATE INDEX "idx_bag_process_order" ON "bag_processes"("order_index");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "factories_code_key" ON "factories"("code");

-- CreateIndex
CREATE INDEX "idx_factory_department" ON "factories"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "lines_code_key" ON "lines"("code");

-- CreateIndex
CREATE INDEX "idx_line_factory_id" ON "lines"("factory_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

-- CreateIndex
CREATE INDEX "idx_team_line_id" ON "teams"("line_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_code_key" ON "groups"("code");

-- CreateIndex
CREATE INDEX "idx_group_team_id" ON "groups"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "hand_bags_code_key" ON "hand_bags"("code");

-- CreateIndex
CREATE INDEX "idx_hand_bag_active" ON "hand_bags"("active");

-- CreateIndex
CREATE INDEX "idx_hand_bag_category" ON "hand_bags"("category");

-- CreateIndex
CREATE INDEX "idx_shift_type" ON "shifts"("type");

-- CreateIndex
CREATE INDEX "idx_attendance_date" ON "attendances"("date");

-- CreateIndex
CREATE INDEX "idx_attendance_status" ON "attendances"("status");

-- CreateIndex
CREATE INDEX "idx_attendance_approved_by" ON "attendances"("approved_by");

-- CreateIndex
CREATE UNIQUE INDEX "unique_attendance_record" ON "attendances"("user_id", "date", "shift");

-- CreateIndex
CREATE INDEX "idx_leave_user_id" ON "leave_requests"("user_id");

-- CreateIndex
CREATE INDEX "idx_leave_date_range" ON "leave_requests"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_leave_status" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "idx_notification_user_id" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_notification_read" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "idx_notification_type" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "idx_approval_approver_id" ON "approval_requests"("approver_id");

-- CreateIndex
CREATE INDEX "idx_approval_submitter_id" ON "approval_requests"("submitter_id");

-- CreateIndex
CREATE INDEX "idx_approval_entity" ON "approval_requests"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "idx_approval_status" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "idx_production_issue_record" ON "production_issues"("production_record_id");

-- CreateIndex
CREATE INDEX "idx_production_issue_type" ON "production_issues"("issue_type");

-- CreateIndex
CREATE UNIQUE INDEX "production_process_forms_form_number_key" ON "production_process_forms"("form_number");

-- CreateIndex
CREATE INDEX "idx_production_form_date" ON "production_process_forms"("date");

-- CreateIndex
CREATE INDEX "idx_production_form_status" ON "production_process_forms"("status");

-- CreateIndex
CREATE INDEX "idx_production_date" ON "production_records"("date");

-- CreateIndex
CREATE INDEX "idx_production_status" ON "production_records"("status");

-- CreateIndex
CREATE INDEX "idx_production_form_id" ON "production_records"("form_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_production_record" ON "production_records"("user_id", "bag_process_id", "hand_bag_id", "date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hourly_data" ON "production_hourly_data"("production_record_id", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "digital_production_forms_form_code_key" ON "digital_production_forms"("form_code");

-- CreateIndex
CREATE INDEX "idx_digital_form_date_shift" ON "digital_production_forms"("date", "shift_type");

-- CreateIndex
CREATE INDEX "idx_digital_form_line" ON "digital_production_forms"("line_id");

-- CreateIndex
CREATE INDEX "idx_digital_form_status" ON "digital_production_forms"("status");

-- CreateIndex
CREATE INDEX "idx_digital_form_creator" ON "digital_production_forms"("created_by_id");

-- CreateIndex
CREATE INDEX "idx_form_entry_form" ON "production_form_entries"("form_id");

-- CreateIndex
CREATE INDEX "idx_form_entry_user" ON "production_form_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_form_entries_form_id_user_id_hand_bag_id_process_key" ON "production_form_entries"("form_id", "user_id", "hand_bag_id", "process_id");

-- CreateIndex
CREATE INDEX "idx_approval_workflow_entity_type" ON "approval_workflows"("entity_type");

-- CreateIndex
CREATE INDEX "idx_approval_workflow_active" ON "approval_workflows"("is_active");

-- CreateIndex
CREATE INDEX "idx_approval_step_workflow" ON "approval_workflow_steps"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_workflow_step" ON "approval_workflow_steps"("workflow_id", "step_order");

-- CreateIndex
CREATE INDEX "idx_signature_user" ON "digital_signatures"("user_id");

-- CreateIndex
CREATE INDEX "idx_signature_entity" ON "digital_signatures"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "idx_signature_signed_at" ON "digital_signatures"("signed_at");

-- CreateIndex
CREATE INDEX "idx_signature_approval" ON "digital_signatures"("approval_request_id");

-- CreateIndex
CREATE INDEX "idx_leave_balance_user_year" ON "leave_balances"("user_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "unique_leave_balance" ON "leave_balances"("user_id", "year", "leave_type");

-- CreateIndex
CREATE INDEX "idx_leave_transaction_user_date" ON "leave_transactions"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_leave_transaction_request" ON "leave_transactions"("leave_request_id");

-- CreateIndex
CREATE INDEX "idx_holiday_date" ON "holidays"("date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_holiday" ON "holidays"("date", "name");

-- CreateIndex
CREATE INDEX "idx_work_schedule_user" ON "work_schedules"("user_id");

-- CreateIndex
CREATE INDEX "idx_work_schedule_day" ON "work_schedules"("day_of_week");

-- CreateIndex
CREATE INDEX "idx_data_export_type" ON "data_exports"("export_type");

-- CreateIndex
CREATE INDEX "idx_data_export_date_range" ON "data_exports"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_data_export_status" ON "data_exports"("status");

-- CreateIndex
CREATE INDEX "idx_report_type" ON "reports"("report_type");

-- CreateIndex
CREATE INDEX "idx_report_active" ON "reports"("is_active");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_default_role_id_fkey" FOREIGN KEY ("default_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factory_managers" ADD CONSTRAINT "factory_managers_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factory_managers" ADD CONSTRAINT "factory_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_managers" ADD CONSTRAINT "line_managers_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_managers" ADD CONSTRAINT "line_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_leaders" ADD CONSTRAINT "team_leaders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_leaders" ADD CONSTRAINT "team_leaders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_leaders" ADD CONSTRAINT "group_leaders_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_leaders" ADD CONSTRAINT "group_leaders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_processes" ADD CONSTRAINT "position_processes_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_processes" ADD CONSTRAINT "position_processes_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "bag_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factories" ADD CONSTRAINT "factories_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lines" ADD CONSTRAINT "lines_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_process_hand_bags" ADD CONSTRAINT "bag_process_hand_bags_bag_process_id_fkey" FOREIGN KEY ("bag_process_id") REFERENCES "bag_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_process_hand_bags" ADD CONSTRAINT "bag_process_hand_bags_hand_bag_id_fkey" FOREIGN KEY ("hand_bag_id") REFERENCES "hand_bags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_issues" ADD CONSTRAINT "production_issues_production_record_id_fkey" FOREIGN KEY ("production_record_id") REFERENCES "production_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_bag_process_id_fkey" FOREIGN KEY ("bag_process_id") REFERENCES "bag_processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_hand_bag_id_fkey" FOREIGN KEY ("hand_bag_id") REFERENCES "hand_bags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "production_process_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_hourly_data" ADD CONSTRAINT "production_hourly_data_production_record_id_fkey" FOREIGN KEY ("production_record_id") REFERENCES "production_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_production_forms" ADD CONSTRAINT "digital_production_forms_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_production_forms" ADD CONSTRAINT "digital_production_forms_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_production_forms" ADD CONSTRAINT "digital_production_forms_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_form_entries" ADD CONSTRAINT "production_form_entries_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "digital_production_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_form_entries" ADD CONSTRAINT "production_form_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_form_entries" ADD CONSTRAINT "production_form_entries_hand_bag_id_fkey" FOREIGN KEY ("hand_bag_id") REFERENCES "hand_bags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_form_entries" ADD CONSTRAINT "production_form_entries_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "bag_processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflow_steps" ADD CONSTRAINT "approval_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "approval_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflow_steps" ADD CONSTRAINT "approval_workflow_steps_approver_role_id_fkey" FOREIGN KEY ("approver_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_transactions" ADD CONSTRAINT "leave_transactions_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
