/**
 * 剧工 (Fablr) — 在线技术文档中心 (Docs Center)
 * 纯中文专业 Dark Studio 文档阅读器
 */
import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Layers,
  Sparkles,
  Share2,
  Database,
  Terminal,
  Shield,
  Search,
  Clock,
  Calendar,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/error-boundary';
import { notify } from '@/shared';
import { DOCS_REGISTRY } from './docs-data';
import styles from './docs.module.less';

const ICON_MAP = {
  BookOpen,
  Layers,
  Sparkles,
  Share2,
  Database,
  Terminal,
  Shield,
};

export const DocsPage: React.FC = () => {
  const [activeDocId, setActiveDocId] = useState<string>(DOCS_REGISTRY[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const activeDoc = useMemo(() => {
    return DOCS_REGISTRY.find(d => d.id === activeDocId) || DOCS_REGISTRY[0];
  }, [activeDocId]);

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return DOCS_REGISTRY;
    const q = searchQuery.toLowerCase();
    return DOCS_REGISTRY.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const categories = useMemo(() => {
    const cats = ['系统架构', '核心流水线', '开发与规范'] as const;
    return cats.map(cat => ({
      name: cat,
      docs: filteredDocs.filter(d => d.category === cat),
    })).filter(g => g.docs.length > 0);
  }, [filteredDocs]);

  const handleCopyContent = () => {
    navigator.clipboard.writeText(activeDoc.content).then(() => {
      setCopied(true);
      notify.success('文档内容已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={styles.container}>
      {/* ── 左侧文档导航 ── */}
      <aside className={styles.docsSidebar}>
        <div className={styles.searchBox}>
          <Search size={14} className="text-[#64748b]" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="搜索架构与开发文档..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {categories.map(group => (
          <div key={group.name} className={styles.categoryGroup}>
            <div className={styles.categoryTitle}>{group.name}</div>
            <div className="flex flex-col gap-1">
              {group.docs.map(doc => {
                const IconComponent = ICON_MAP[doc.iconName] || BookOpen;
                const isActive = doc.id === activeDoc.id;
                return (
                  <button
                    key={doc.id}
                    className={`${styles.docNavItem} ${isActive ? styles.activeDoc : ''}`}
                    onClick={() => setActiveDocId(doc.id)}
                  >
                    <IconComponent size={15} />
                    <span className="truncate">{doc.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      {/* ── 右侧主阅读视口 ── */}
      <main className={styles.readingViewport}>
        {/* 头部 Meta */}
        <div className={styles.docHeader}>
          <div className={styles.docBreadcrumb}>
            <span>官方技术文档</span>
            <ChevronRight size={12} />
            <span>{activeDoc.category}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className={styles.docTitle}>{activeDoc.title}</h1>
              <p className={styles.docDesc}>{activeDoc.description}</p>
            </div>

            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161726] hover:bg-[#1e1f33] text-xs text-text-secondary border border-white/10 transition-colors flex-shrink-0"
              onClick={handleCopyContent}
              title="复制 Markdown 原文"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? '已复制' : '复制原文'}
            </button>
          </div>

          <div className={styles.docMetaRow}>
            <span className={styles.metaItem}>
              <Clock size={13} /> 阅读时间：{activeDoc.readTime}
            </span>
            <span className={styles.metaItem}>
              <Calendar size={13} /> 最后更新：{activeDoc.lastUpdated}
            </span>
          </div>
        </div>

        {/* Markdown 原文内容排版 */}
        <article className={styles.markdownContent}>
          {activeDoc.content.split('\n\n').map((block, idx) => {
            const trimmed = block.trim();
            if (trimmed.startsWith('# ')) {
              return null; // 主标题已在 Header 显示
            }
            if (trimmed.startsWith('## ')) {
              return <h2 key={idx}>{trimmed.replace('## ', '')}</h2>;
            }
            if (trimmed.startsWith('### ')) {
              return <h3 key={idx}>{trimmed.replace('### ', '')}</h3>;
            }
            if (trimmed.startsWith('```')) {
              const lines = trimmed.split('\n');
              const code = lines.slice(1, lines.length - 1).join('\n');
              return (
                <pre key={idx}>
                  <code>{code}</code>
                </pre>
              );
            }
            if (trimmed.startsWith('> ')) {
              return <blockquote key={idx}>{trimmed.replace(/^>\s*/gm, '')}</blockquote>;
            }
            if (trimmed.startsWith('|') && trimmed.includes('\n|')) {
              const lines = trimmed.split('\n').filter(l => l.trim().startsWith('|'));
              if (lines.length >= 2) {
                const parseRow = (rowStr: string) =>
                  rowStr
                    .split('|')
                    .slice(1, -1)
                    .map(c => c.trim());
                const headers = parseRow(lines[0]);
                const bodyRows = lines.slice(2).map(parseRow);
                return (
                  <table key={idx}>
                    <thead>
                      <tr>
                        {headers.map((h, hIdx) => (
                          <th key={hIdx}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bodyRows.map((r, rIdx) => (
                        <tr key={rIdx}>
                          {r.map((c, cIdx) => (
                            <td key={cIdx}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              }
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              const items = trimmed
                .split('\n')
                .map(l => l.replace(/^[-*]\s*/, '').trim())
                .filter(Boolean);
              return (
                <ul key={idx}>
                  {items.map((item, itemIdx) => (
                    <li key={itemIdx}>{item}</li>
                  ))}
                </ul>
              );
            }
            return <p key={idx}>{trimmed}</p>;
          })}
        </article>
      </main>
    </div>
  );
};

export default withErrorBoundary(DocsPage, { name: 'DocsPage' });
