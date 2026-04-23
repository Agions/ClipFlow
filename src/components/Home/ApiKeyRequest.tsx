import { logger } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Key, Mail, Building2, MapPin, User } from 'lucide-react';
import { AI_MODEL_INFO, AIModelType } from '@/types';
import styles from './ApiKeyRequest.module.less';

interface ApiKeyRequestProps {
  visible: boolean;
  onClose: () => void;
  modelType?: AIModelType;
}

const Text = ({ strong, secondary, children }: { strong?: boolean; secondary?: boolean; children: React.ReactNode }) => {
  const className = secondary ? 'text-muted-foreground text-sm' : undefined;
  return strong ? <strong className={className}>{children}</strong> : <span className={className}>{children}</span>;
};

const Link = ({ href, target, children }: { href?: string; target?: string; children: React.ReactNode }) => (
  <a href={href} target={target} rel="noopener noreferrer" className="text-accent-primary hover:underline">{children}</a>
);

const ApiKeyRequest: React.FC<ApiKeyRequestProps> = ({
  visible,
  onClose,
  modelType
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedType, setSelectedType] = useState<AIModelType>(modelType ?? 'openai');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [region, setRegion] = useState('');
  const [usage, setUsage] = useState('');
  const [description, setDescription] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const modelInfo = AI_MODEL_INFO[selectedType];

  useEffect(() => {
    if (visible) {
      setSubmitted(false);
      setName('');
      setEmail('');
      setOrganization('');
      setRegion('');
      setUsage('');
      setDescription('');
      setAgreed(false);
      setErrors({});
    }
  }, [visible]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = '请输入您的姓名';
    if (!email.trim()) {
      newErrors.email = '请输入您的邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    if (!region) newErrors.region = '请选择您的所在地区';
    if (!usage) newErrors.usage = '请选择您的使用场景';
    if (!description.trim()) newErrors.description = '请简要描述您的使用需求';
    if (!agreed) newErrors.agreement = '请阅读并同意服务条款';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitting(false);
      setSubmitted(true);
    } catch (error) {
      logger.error('表单提交失败:', { error });
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const renderApiRequestForm = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex flex-col gap-4">
      {/* Model Type Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">选择模型提供商</label>
        <Select value={selectedType} onValueChange={(value: string) => value && setSelectedType(value as AIModelType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AI_MODEL_INFO).map(([key, model]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <Key size={14} />
                  <span>{model.name}</span>
                  <span className="text-muted-foreground text-xs">({model.provider})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alert */}
      <div className="rounded-md border border-accent-primary/30 bg-accent-primary/10 px-4 py-3 text-sm">
        <p className="font-medium text-accent-primary mb-1">{modelInfo.name}申请说明</p>
        <p className="text-muted-foreground">
          您即将申请{modelInfo.provider}提供的{modelInfo.name}的API访问权限。请填写以下信息，我们将帮助您提交申请。
        </p>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">姓名</label>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="请输入您的姓名"
            className={"pl-9 " + (errors.name ? 'border-destructive' : '')}
          />
        </div>
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">邮箱</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="请输入您的邮箱"
            type="email"
            className={"pl-9 " + (errors.email ? 'border-destructive' : '')}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      {/* Organization */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">公司/组织 <span className="text-muted-foreground font-normal">(选填)</span></label>
        <div className="relative">
          <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={organization}
            onChange={e => setOrganization(e.target.value)}
            placeholder="请输入您的公司或组织名称"
            className="pl-9"
          />
        </div>
      </div>

      {/* Region */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">所在地区</label>
        <Select value={region} onValueChange={(val: string | null) => val && setRegion(val)}>
          <SelectTrigger className={errors.region ? 'border-destructive' : ''}>
            <SelectValue placeholder="请选择所在地区" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beijing">北京市</SelectItem>
            <SelectItem value="shanghai">上海市</SelectItem>
            <SelectItem value="guangdong">广东省</SelectItem>
            <SelectItem value="jiangsu">江苏省</SelectItem>
            <SelectItem value="zhejiang">浙江省</SelectItem>
            <SelectItem value="other">其他地区</SelectItem>
          </SelectContent>
        </Select>
        {errors.region && <p className="text-xs text-destructive">{errors.region}</p>}
      </div>

      {/* Usage */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-primary">使用场景</label>
        <div className="flex flex-col gap-2">
          {[
            { value: 'personal', label: '个人学习和研究' },
            { value: 'business', label: '商业项目开发' },
            { value: 'education', label: '教育和培训' },
            { value: 'other', label: '其他用途' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="usage"
                value={opt.value}
                checked={usage === opt.value}
                onChange={e => setUsage(e.target.value)}
                className="accent-orange-500"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
        {errors.usage && <p className="text-xs text-destructive">{errors.usage}</p>}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">使用说明</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="请简要描述您打算如何使用API，包括预期的调用频率和用途等"
          rows={4}
          className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${errors.description ? 'border-destructive' : ''}`}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      {/* Agreement */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="agreement"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 accent-orange-500"
        />
        <label htmlFor="agreement" className="text-sm text-muted-foreground">
          我已阅读并同意{modelInfo.provider}的<Link href="#" target="_blank">服务条款</Link>和<Link href="#" target="_blank">隐私政策</Link>
        </label>
      </div>
      {errors.agreement && <p className="text-xs text-destructive -mt-2">{errors.agreement}</p>}
    </form>
  );

  const renderSuccessContent = () => (
    <div className={styles.successContent}>
      <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm mb-6">
        <p className="font-medium text-green-500 mb-1">申请已提交</p>
        <p className="text-muted-foreground">
          您的{modelInfo.name}API密钥申请已成功提交，我们将尽快审核并通过邮件通知您。审核通常需要1-3个工作日，请耐心等待。
        </p>
      </div>

      <div className={styles.nextSteps}>
        <Text strong>接下来您可以：</Text>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
          <li>访问{modelInfo.provider}官方网站了解更多API使用信息</li>
          <li>查看我们的开发文档，了解如何集成API</li>
          <li>准备好您的账户信息，以便审核通过后立即使用</li>
        </ul>
      </div>

      <div className={styles.contact + ' mt-6'}>
        <Text secondary>
          如有任何问题，请发送邮件至 <Link href="mailto:support@CutDeck.com">support@CutDeck.com</Link> 获取帮助
        </Text>
      </div>
    </div>
  );

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={styles.apiKeyRequestModal} style={{ width: 600 }}>
        <DialogHeader>
          <DialogTitle>{submitted ? "申请已提交" : `申请${modelInfo.name}API密钥`}</DialogTitle>
        </DialogHeader>
        {submitted ? renderSuccessContent() : renderApiRequestForm()}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            {submitted ? '关闭' : '取消'}
          </Button>
          {!submitted && (
            <Button
              className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? '提交中...' : '提交申请'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyRequest;
