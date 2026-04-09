import React, { memo } from 'react';
import { Card, Row, Col, Space, Typography } from 'antd';
import type { ScriptTemplate } from '@/core/types';
import styles from '../index.module.less';

const { Paragraph } = Typography;

interface TemplateStepProps {
  templates: ScriptTemplate[];
  selectedTemplate: ScriptTemplate | null;
  onSelect: (template: ScriptTemplate) => void;
}

const TemplateStep: React.FC<TemplateStepProps> = ({
  templates,
  selectedTemplate,
  onSelect,
}) => {
  return (
    <Card title="选择解说模板" className={styles.stepCard}>
      <Row gutter={[16, 16]}>
        {templates.map((template) => (
          <Col span={8} key={template.id}>
            <Card
              hoverable
              className={`${styles.templateCard} ${
                selectedTemplate?.id === template.id ? styles.selected : ''
              }`}
              onClick={() => onSelect(template)}
              title={template.name}
            >
              <Paragraph ellipsis={{ rows: 2 }}>{template.description}</Paragraph>
              <Space wrap>
                {(template as any).tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </Space>
              {(template as any).recommended && (
                <div className={styles.recommendedBadge}>推荐</div>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default memo(TemplateStep);
