import { useState } from 'react';
import { App, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import * as employeeService from '@/services/employee';
import type { Employee, EmployeeStatus, Gender } from '@/types';

interface EmployeeFormModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  record?: Employee | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const GENDERS: Gender[] = ['男', '女'];
const STATUSES: EmployeeStatus[] = ['在职', '试用期', '离职'];

// 新增 / 编辑共用的员工表单弹窗：字段、校验、提交逻辑全部收敛在这一处。
export default function EmployeeFormModal({
  mode,
  open,
  record,
  onCancel,
  onSuccess,
}: EmployeeFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Employee>();
  const [submitting, setSubmitting] = useState(false);
  const [depts, setDepts] = useState<string[]>([]); // 部门下拉选项列表
  const [positions, setPositions] = useState<string[]>([]); // 职位下拉选项列表

  const loadOptions = async () => {
    try {
      const opt = await employeeService.getOptions();
      setDepts(opt.depts);
      setPositions(opt.positions); // 存入state并触发重新渲染
    } catch {
      // 字典拉取失败不阻断表单打开，留空下拉即可
    }
  };

  const fillForm = () => {
    if (mode === 'edit' && record) {
      form.setFieldsValue({
        ...record,
        entryDate: dayjs(record.entryDate),
      } as unknown as Partial<Employee>);
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: '在职',
        gender: '男',
        entryDate: dayjs(),
      } as unknown as Partial<Employee>);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        entryDate: values.entryDate ? dayjs(values.entryDate).format('YYYY-MM-DD') : undefined,
      };
      setSubmitting(true);
      if (mode === 'create') {
        await employeeService.add(payload);
        message.success('新增成功');
      } else if (record) {
        await employeeService.update({ ...record, ...payload });
        message.success('保存成功');
      }
      onSuccess();
    } catch {
      // 校验未通过或请求失败，错误提示已由校验/请求层处理
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={mode === 'edit' ? '编辑员工' : '新增员工'}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      afterOpenChange={(visible) => {
        // 弹窗打开时再拉一次部门+职位数据
        if (visible) {
          loadOptions();
          fillForm();
        }
      }}
      width={620}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="请输入姓名" maxLength={20} />
        </Form.Item>
        <Form.Item label="性别" name="gender" rules={[{ required: true, message: '请选择性别' }]}>
          <Select options={GENDERS.map((g) => ({ value: g, label: g }))} placeholder="请选择性别" />
        </Form.Item>
        <Form.Item label="部门" name="dept" rules={[{ required: true, message: '请选择部门' }]}>
          <Select
            options={depts.map((d) => ({ value: d, label: d }))}
            placeholder="请选择部门"
            showSearch // 支持输入筛选
            optionFilterProp="label" // 按label筛选，而不是value
          />
        </Form.Item>
        <Form.Item label="职位" name="position" rules={[{ required: true, message: '请选择职位' }]}>
          <Select
            options={positions.map((p) => ({ value: p, label: p }))}
            placeholder="请选择职位"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item label="薪资" name="salary" rules={[{ required: true, message: '请输入薪资' }]}>
          <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入薪资" />
        </Form.Item>
        <Form.Item
          label="电话"
          name="phone"
          rules={[
            { required: true, message: '请输入电话' },
            { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
          ]}
        >
          <Input placeholder="请输入手机号" maxLength={11} />
        </Form.Item>
        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        >
          <Input placeholder="请输入邮箱" maxLength={50} />
        </Form.Item>
        <Form.Item
          label="入职日期"
          name="entryDate"
          rules={[{ required: true, message: '请选择入职日期' }]}
        >
          <DatePicker style={{ width: '100%' }} placeholder="请选择入职日期" />
        </Form.Item>
        <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
          <Select
            options={STATUSES.map((s) => ({ value: s, label: s }))}
            placeholder="请选择状态"
          />
        </Form.Item>
        <Form.Item
          label="身份证号"
          name="idCard"
          rules={[
            { required: true, message: '请输入身份证号' },
            { pattern: /^\d{17}[\dXx]$/, message: '身份证号格式不正确' },
          ]}
        >
          <Input placeholder="请输入身份证号" maxLength={18} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
