import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Steps,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Radio,
  Button,
  Space,
  Descriptions,
  Upload,
  App,
  Result,
  Tag,
} from 'antd';
import {
  InboxOutlined,
  LeftOutlined,
  RightOutlined,
  SaveOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as employeeService from '@/services/employee';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants';
import type { Employee, EmployeeStatus, Gender } from '@/types';

interface Draft {
  step: number;
  values: Record<string, unknown>;
  savedAt: string;
}

interface RolePreview {
  menus: string[];
  buttons: string[];
  fields: string[];
}

// 角色 → 权限预览（与 mock/users.ts 的 rolePermissions 语义一致的只读映射，仅供向导展示）
const ROLE_PREVIEWS: Record<'admin' | 'manager' | 'finance' | 'user', RolePreview> = {
  admin: { menus: ['全部菜单'], buttons: ['全部按钮'], fields: ['全部字段'] },
  manager: {
    menus: ['数据看板', '员工管理', '数据导入', '流程中心', '表单测试'],
    buttons: ['导出', '导入', '新增', '编辑', '删除', '审批', '驳回'],
    fields: ['薪资'],
  },
  finance: {
    menus: ['数据看板', '员工管理', '流程中心'],
    buttons: ['导出', '导入', '审批'],
    fields: ['薪资', '身份证'],
  },
  user: {
    menus: ['数据看板', '流程中心', '表单测试'],
    buttons: ['提交'],
    fields: [],
  },
};

const ROLE_LABEL = {
  admin: '系统管理员',
  manager: '研发主管',
  finance: '财务',
  user: '普通员工',
} as const;

const GENDERS: Gender[] = ['男', '女'];
const STATUSES: EmployeeStatus[] = ['在职', '试用期', '离职'];
const ROLES = Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[];

// 每步要校验的字段名；undefined 表示该步无需 form 校验（权限预览/附件步）
const STEP_FIELDS: (string[] | undefined)[] = [
  ['name', 'gender', 'phone', 'email', 'idCard', 'entryDate'],
  ['dept', 'position', 'salary', 'status'],
  ['role'],
  undefined,
];

type FormMode = 'fill' | 'done';

export default function FormPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [depts, setDepts] = useState<string[]>([]);
  const [positionsByDept, setPositionsByDept] = useState<Record<string, string[]>>({});
  const [curDept, setCurDept] = useState<string | undefined>();
  const [current, setCurrent] = useState(0); // 当前步号 0~3
  const [mode, setMode] = useState<FormMode>('fill');
  const [loading, setLoading] = useState(true);
  const currentRef = useRef(0);

  currentRef.current = current;

  // 进入时：拉字典 + 询问是否续填草稿
  useEffect(() => {
    employeeService.getOptions().then((opt) => {
      setDepts(opt.depts);
      setPositionsByDept(opt.positionsByDept ?? {});
      setLoading(false);
    });
    form.setFieldsValue({ status: '在职', gender: '男' });

    const draft = storage.get<Draft>(STORAGE_KEYS.DRAFT);
    if (draft) {
      modal.confirm({
        title: '发现上次未提交的草稿',
        icon: <ExclamationCircleOutlined />,
        content: `上次填写到第 ${draft.step + 1} 步，保存于 ${draft.savedAt}。是否继续？`,
        okText: '继续填写',
        cancelText: '重新开始',
        onOk: () => {
          form.setFieldsValue(draft.values);
          const dept = draft.values.dept as string | undefined;
          if (dept) setCurDept(dept);
          const step = draft.step >= 0 && draft.step < 4 ? draft.step : 0;
          setCurrent(step);
        },
        onCancel: () => storage.remove(STORAGE_KEYS.DRAFT),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = (step: number) => {
    const v = form.getFieldsValue(true) as Record<string, unknown>;
    if (v.entryDate && dayjs.isDayjs(v.entryDate))
      v.entryDate = dayjs(v.entryDate).format('YYYY-MM-DD');
    storage.set(STORAGE_KEYS.DRAFT, { step, values: v, savedAt: dayjs().format('MM-DD HH:mm') });
  };

  // 草稿自动保存：值变化后 30 秒静默保存当前步；离开页面时也保存并提示
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDraft(currentRef.current);
    }, 30000);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      saveDraft(currentRef.current);
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeptChange = (dept?: string) => {
    setCurDept(dept);
    form.setFieldValue('position', undefined); // 切部门清空已选岗位（真联动）
  };

  const next = async () => {
    const fields = STEP_FIELDS[current];
    if (fields) {
      try {
        await form.validateFields(fields);
      } catch {
        return; // 校验失败：红字由 antd 显示，停在此步
      }
    }
    setCurrent((c) => c + 1);
  };

  const prev = () => setCurrent((c) => Math.max(0, c - 1));

  const previewRole = Form.useWatch('role', form) as keyof typeof ROLE_PREVIEWS | undefined;
  const preview = previewRole ? ROLE_PREVIEWS[previewRole] : undefined;

  const handleSubmit = async () => {
    try {
      await form.validateFields(['role']);
    } catch {
      return;
    }
    try {
      const v = form.getFieldsValue(true);
      const payload: Partial<Employee> = {
        name: v.name,
        gender: v.gender,
        dept: v.dept,
        position: v.position,
        salary: Number(v.salary),
        phone: v.phone,
        email: v.email,
        entryDate: dayjs(v.entryDate).format('YYYY-MM-DD'),
        status: v.status,
        idCard: v.idCard,
        role: v.role,
        attachment: v.attachment?.name,
      };
      await employeeService.add(payload);
      storage.remove(STORAGE_KEYS.DRAFT);
      message.success('提交成功，已写入员工列表');
      form.resetFields();
      setCurrent(0);
      setMode('done');
    } catch {
      message.error('提交失败，请重试');
    }
  };

  if (mode === 'done') {
    return (
      <Card>
        <Result
          status="success"
          title="入职申请提交成功"
          subTitle="数据已写入员工列表，可在「员工管理」查看。"
          extra={
            <Button type="primary" onClick={() => setMode('fill')}>
              再填一单
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title="人事入职申请（多步向导）"
      extra={
        <Button
          size="small"
          icon={<SaveOutlined />}
          onClick={() => {
            saveDraft(current);
            message.success('草稿已保存');
          }}
        >
          保存草稿
        </Button>
      }
      loading={loading}
    >
      <Steps
        size="small"
        current={current}
        items={[
          { title: '基本信息' },
          { title: '岗位信息' },
          { title: '系统权限' },
          { title: '附件提交' },
        ]}
        style={{ maxWidth: 720, marginBottom: 24 }}
      />

      <Form form={form} layout="vertical" style={{ maxWidth: 720 }}>
        {/* Step 1 基本信息 */}
        {current === 0 && (
          <div>
            <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input placeholder="请输入姓名" maxLength={20} />
            </Form.Item>
            <Form.Item
              label="性别"
              name="gender"
              rules={[{ required: true, message: '请选择性别' }]}
            >
              <Select
                options={GENDERS.map((g) => ({ value: g, label: g }))}
                placeholder="请选择性别"
              />
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
              label="身份证号"
              name="idCard"
              rules={[
                { required: true, message: '请输入身份证号' },
                { pattern: /^\d{17}[\dXx]$/, message: '身份证号格式不正确' },
              ]}
            >
              <Input placeholder="请输入身份证号" maxLength={18} />
            </Form.Item>
            <Form.Item
              label="入职日期"
              name="entryDate"
              rules={[{ required: true, message: '请选择入职日期' }]}
            >
              <DatePicker style={{ width: '100%' }} placeholder="请选择入职日期" />
            </Form.Item>
          </div>
        )}

        {/* Step 2 岗位信息 */}
        {current === 1 && (
          <div>
            <Form.Item label="部门" name="dept" rules={[{ required: true, message: '请选择部门' }]}>
              <Select
                options={depts.map((d) => ({ value: d, label: d }))}
                placeholder="请选择部门"
                showSearch
                optionFilterProp="label"
                onChange={handleDeptChange}
              />
            </Form.Item>
            <Form.Item
              label="岗位"
              name="position"
              rules={[{ required: true, message: '请选择岗位' }]}
            >
              <Select
                options={(positionsByDept[curDept ?? ''] ?? []).map((p) => ({
                  value: p,
                  label: p,
                }))}
                placeholder={curDept ? '请选择岗位' : '请先选择部门'}
                showSearch
                optionFilterProp="label"
                disabled={!curDept}
              />
            </Form.Item>
            <Form.Item
              label="薪资"
              name="salary"
              rules={[{ required: true, message: '请输入薪资' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入薪资" />
            </Form.Item>
            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select
                options={STATUSES.map((s) => ({ value: s, label: s }))}
                placeholder="请选择状态"
              />
            </Form.Item>
          </div>
        )}

        {/* Step 3 系统权限 */}
        {current === 2 && (
          <div>
            <Form.Item
              label="授予该员工的系统角色"
              name="role"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Radio.Group>
                <Space orientation="vertical">
                  {ROLES.map((r) => (
                    <Radio key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </Form.Item>
            {preview && (
              <Card size="small" title="权限预览（该角色能看什么）" style={{ marginTop: 8 }}>
                <Descriptions
                  column={1}
                  size="small"
                  items={[
                    {
                      key: 'm',
                      label: '菜单',
                      children: preview.menus.map((m) => <Tag key={m}>{m}</Tag>),
                    },
                    {
                      key: 'b',
                      label: '按钮',
                      children: preview.buttons.map((b) => (
                        <Tag key={b} color="blue">
                          {b}
                        </Tag>
                      )),
                    },
                    {
                      key: 'f',
                      label: '字段',
                      children: preview.fields.length ? (
                        preview.fields.map((f) => (
                          <Tag key={f} color="green">
                            {f}
                          </Tag>
                        ))
                      ) : (
                        <Tag color="default">无敏感字段</Tag>
                      ),
                    },
                  ]}
                />
              </Card>
            )}
          </div>
        )}

        {/* Step 4 附件 + 提交 */}
        {current === 3 && (
          <div>
            <Form.Item
              label="上传附件（可选）"
              name="attachment"
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            >
              <Upload.Dragger beforeUpload={() => false} maxCount={1}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此上传</p>
                <p className="ant-upload-hint">仅演示，不上传真实服务器；提交后记录文件名。</p>
              </Upload.Dragger>
            </Form.Item>
            <Descriptions
              column={1}
              size="small"
              bordered
              style={{ marginTop: 8 }}
              items={[
                { key: 'r', label: '角色', children: previewRole ? ROLE_LABEL[previewRole] : '-' },
                { key: 'd', label: '提交说明', children: '确认信息无误后点击右下角「提交」' },
              ]}
            />
          </div>
        )}

        <Space style={{ marginTop: 24 }}>
          {current > 0 && (
            <Button icon={<LeftOutlined />} onClick={prev}>
              上一步
            </Button>
          )}
          {current < 3 ? (
            <Button type="primary" icon={<RightOutlined />} onClick={() => void next()}>
              下一步
            </Button>
          ) : (
            <Button type="primary" icon={<CheckOutlined />} onClick={() => void handleSubmit()}>
              提交
            </Button>
          )}
        </Space>
      </Form>
    </Card>
  );
}
