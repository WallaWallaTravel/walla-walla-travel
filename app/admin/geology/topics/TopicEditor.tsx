'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Topic {
  id?: number;
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  excerpt: string;
  topic_type: string;
  difficulty: string;
  hero_image_url: string;
  display_order: number;
  is_featured: boolean;
  is_published: boolean;
  related_winery_ids: number[];
  related_topic_ids: number[];
  author_name: string;
  sources: string;
  verified: boolean;
}

interface TopicEditorProps {
  initialData?: Partial<Topic>;
  isEditing?: boolean;
}

const TOPIC_TYPES = [
  { value: 'overview', label: 'Overview' },
  { value: 'ice_age_floods', label: 'Ice Age Floods' },
  { value: 'soil_types', label: 'Soil Types' },
  { value: 'basalt', label: 'Basalt' },
  { value: 'terroir', label: 'Terroir' },
  { value: 'climate', label: 'Climate' },
  { value: 'water', label: 'Water' },
  { value: 'wine_connection', label: 'Wine Connection' },
];

const DIFFICULTY_LEVELS = [
  { value: 'general', label: 'General (Everyone)' },
  { value: 'intermediate', label: 'Intermediate (Wine Enthusiasts)' },
  { value: 'advanced', label: 'Advanced (Geology Nerds)' },
];

// ============================================================================
// Markdown Toolbar
// ============================================================================

interface ToolbarAction {
  label: string;
  icon: string;
  title: string;
  action: (textarea: HTMLTextAreaElement) => { text: string; selectionStart: number; selectionEnd: number };
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    label: 'Heading',
    icon: 'Heading',
    title: 'Add a section heading',
    action: (ta) => {
      const { selectionStart, selectionEnd, value } = ta;
      const selected = value.substring(selectionStart, selectionEnd);
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const prefix = value.substring(lineStart, selectionStart);
      if (prefix.startsWith('## ')) {
        return { text: value.substring(0, lineStart) + prefix.slice(3) + value.substring(selectionStart), selectionStart: selectionStart - 3, selectionEnd: selectionEnd - 3 };
      }
      const insert = selected ? `## ${selected}` : '## Section Title';
      return { text: value.substring(0, selectionStart) + insert + value.substring(selectionEnd), selectionStart: selectionStart + 3, selectionEnd: selectionStart + insert.length };
    },
  },
  {
    label: 'Subheading',
    icon: 'Subheading',
    title: 'Add a subheading within a section',
    action: (ta) => {
      const { selectionStart, selectionEnd, value } = ta;
      const selected = value.substring(selectionStart, selectionEnd);
      const insert = selected ? `### ${selected}` : '### Subheading';
      return { text: value.substring(0, selectionStart) + insert + value.substring(selectionEnd), selectionStart: selectionStart + 4, selectionEnd: selectionStart + insert.length };
    },
  },
  {
    label: 'Bold',
    icon: 'Bold',
    title: 'Make selected text bold',
    action: (ta) => {
      const { selectionStart, selectionEnd, value } = ta;
      const selected = value.substring(selectionStart, selectionEnd);
      const insert = selected ? `**${selected}**` : '**bold text**';
      return { text: value.substring(0, selectionStart) + insert + value.substring(selectionEnd), selectionStart: selectionStart + 2, selectionEnd: selectionStart + insert.length - 2 };
    },
  },
  {
    label: 'Italic',
    icon: 'Italic',
    title: 'Make selected text italic',
    action: (ta) => {
      const { selectionStart, selectionEnd, value } = ta;
      const selected = value.substring(selectionStart, selectionEnd);
      const insert = selected ? `*${selected}*` : '*italic text*';
      return { text: value.substring(0, selectionStart) + insert + value.substring(selectionEnd), selectionStart: selectionStart + 1, selectionEnd: selectionStart + insert.length - 1 };
    },
  },
  {
    label: 'Bullet List',
    icon: 'Bullet List',
    title: 'Create a bullet point list',
    action: (ta) => {
      const { selectionStart, selectionEnd, value } = ta;
      const selected = value.substring(selectionStart, selectionEnd);
      if (selected) {
        const bulleted = selected.split('\n').map(line => line.trim() ? `- ${line}` : line).join('\n');
        return { text: value.substring(0, selectionStart) + bulleted + value.substring(selectionEnd), selectionStart, selectionEnd: selectionStart + bulleted.length };
      }
      const insert = '- Item one\n- Item two\n- Item three';
      return { text: value.substring(0, selectionStart) + insert + value.substring(selectionEnd), selectionStart: selectionStart + 2, selectionEnd: selectionStart + 10 };
    },
  },
  {
    label: 'Link',
    icon: 'Link',
    title: 'Add a web link',
    action: (ta) => {
      const { selectionStart, selectionEnd, value } = ta;
      const selected = value.substring(selectionStart, selectionEnd);
      const insert = selected ? `[${selected}](url)` : '[link text](https://example.com)';
      return { text: value.substring(0, selectionStart) + insert + value.substring(selectionEnd), selectionStart: selected ? selectionStart + selected.length + 3 : selectionStart + 1, selectionEnd: selected ? selectionStart + insert.length - 1 : selectionStart + 10 };
    },
  },
];

function MarkdownToolbar({ textareaRef, onContentChange }: { textareaRef: React.RefObject<HTMLTextAreaElement | null>; onContentChange: (content: string) => void }) {
  const handleAction = useCallback((action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const result = action.action(textarea);
    onContentChange(result.text);

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }, [textareaRef, onContentChange]);

  return (
    <div className="flex items-center gap-1 pb-2 border-b border-gray-200 mb-2">
      {TOOLBAR_ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => handleAction(action)}
          title={action.title}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 transition-colors"
        >
          {action.icon}
        </button>
      ))}
      <div className="ml-auto text-xs text-gray-500">
        Select text, then click a button to format it
      </div>
    </div>
  );
}

// ============================================================================
// Inline Markdown Renderer
// ============================================================================

function renderInlineMarkdown(text: string): React.ReactNode {
  // Split on bold (**text**), italic (*text*), and links [text](url)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic: *text* (but not **)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Link: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    // Find earliest match
    const matches = [
      boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
      linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    // Add text before the match
    if (first.index > 0) {
      parts.push(remaining.substring(0, first.index));
    }

    if (first.type === 'bold') {
      parts.push(<strong key={key++}>{first.match[1]}</strong>);
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === 'italic') {
      parts.push(<em key={key++}>{first.match[1]}</em>);
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === 'link') {
      parts.push(
        <a key={key++} href={first.match[2]} className="text-[#722F37] underline" target="_blank" rel="noopener noreferrer">
          {first.match[1]}
        </a>
      );
      remaining = remaining.substring(first.index + first.match[0].length);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ============================================================================
// Search Visibility Score Panel
// ============================================================================

interface ScoreItem {
  key: string;
  label: string;
  status: 'good' | 'ok' | 'missing';
  tip: string;
  action?: () => void;
  actionLabel?: string;
}

function ContentScorePanel({
  formData,
  onAddFaq,
  onGenerateExcerpt,
}: {
  formData: Topic;
  onAddFaq: () => void;
  onGenerateExcerpt: () => void;
}) {
  const items: ScoreItem[] = useMemo(() => {
    const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
    const hasHeadings = /^##\s/m.test(formData.content);
    const hasFaq = /##\s*(frequently asked|faq|common questions)/i.test(formData.content);
    const excerptLen = (formData.excerpt || '').length;

    return [
      {
        key: 'length',
        label: 'Article length',
        status: wordCount >= 800 ? 'good' : wordCount >= 300 ? 'ok' : 'missing',
        tip:
          wordCount >= 800
            ? `${wordCount} words — great depth for search engines`
            : wordCount >= 300
              ? `${wordCount} words — aim for 800+ for best search visibility`
              : `${wordCount} words — search engines prefer 300+ words minimum`,
      },
      {
        key: 'excerpt',
        label: 'Summary for search results',
        status: excerptLen >= 50 && excerptLen <= 160 ? 'good' : excerptLen > 0 ? 'ok' : 'missing',
        tip:
          excerptLen >= 50
            ? `${excerptLen} characters — this is what appears in Google results`
            : 'Add a 1-2 sentence summary — this shows up in Google search results',
        action: !formData.excerpt && formData.content.length > 50 ? onGenerateExcerpt : undefined,
        actionLabel: 'Generate from article',
      },
      {
        key: 'headings',
        label: 'Section headings',
        status: hasHeadings ? 'good' : 'missing',
        tip: hasHeadings
          ? 'Good structure — helps readers and search engines navigate'
          : 'Use the Heading button to break your article into sections',
      },
      {
        key: 'image',
        label: 'Hero image',
        status: formData.hero_image_url ? 'good' : 'missing',
        tip: formData.hero_image_url
          ? 'Image set — helps with search and social media sharing'
          : 'Articles with images get more clicks in search results',
      },
      {
        key: 'author',
        label: 'Author name',
        status: formData.author_name ? 'good' : 'missing',
        tip: formData.author_name
          ? 'Expert attribution builds trust with search engines'
          : 'Search engines value named expert authors',
      },
      {
        key: 'sources',
        label: 'Sources cited',
        status: formData.sources ? 'good' : 'ok',
        tip: formData.sources
          ? 'Citations build authority and trust'
          : 'Citing sources boosts credibility with search engines and AI',
      },
      {
        key: 'faq',
        label: 'FAQ section',
        status: hasFaq ? 'good' : 'ok',
        tip: hasFaq
          ? 'FAQ helps your article appear in voice search, AI answers, and Google snippets'
          : 'Add common questions — helps with voice search, AI assistants, and Google featured snippets',
        action: !hasFaq ? onAddFaq : undefined,
        actionLabel: 'Add FAQ section to article',
      },
    ];
  }, [formData, onAddFaq, onGenerateExcerpt]);

  const goodCount = items.filter((i) => i.status === 'good').length;
  const total = items.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Search Visibility</h3>
        <span
          className={`text-sm font-medium px-3 py-1 rounded-full ${
            goodCount >= 6
              ? 'bg-green-100 text-green-800'
              : goodCount >= 4
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
          }`}
        >
          {goodCount}/{total}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        These tips help your article get found by Google, voice assistants, and AI search tools.
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex-shrink-0 text-sm ${
                item.status === 'good'
                  ? 'text-green-600'
                  : item.status === 'ok'
                    ? 'text-amber-500'
                    : 'text-gray-400'
              }`}
            >
              {item.status === 'good' ? '✓' : '○'}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${item.status === 'good' ? 'text-gray-900' : 'text-gray-700'}`}
              >
                {item.label}
              </p>
              <p className="text-xs text-gray-500">{item.tip}</p>
              {item.action && (
                <button
                  type="button"
                  onClick={item.action}
                  className="mt-1 text-xs text-[#722F37] hover:text-[#5a252c] font-medium"
                >
                  {item.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function TopicEditor({ initialData, isEditing = false }: TopicEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState<Topic>({
    slug: initialData?.slug || '',
    title: initialData?.title || '',
    subtitle: initialData?.subtitle || '',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    topic_type: initialData?.topic_type || 'overview',
    difficulty: initialData?.difficulty || 'general',
    hero_image_url: initialData?.hero_image_url || '',
    display_order: initialData?.display_order || 0,
    is_featured: initialData?.is_featured || false,
    is_published: initialData?.is_published || false,
    related_winery_ids: initialData?.related_winery_ids || [],
    related_topic_ids: initialData?.related_topic_ids || [],
    author_name: initialData?.author_name || '',
    sources: initialData?.sources || '',
    verified: initialData?.verified || false,
    ...(initialData?.id && { id: initialData.id }),
  });

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Auto-generate excerpt from first paragraph of content
  const handleGenerateExcerpt = useCallback(() => {
    const content = formData.content;
    // Find the first non-heading, non-empty line
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-') && trimmed.length > 20) {
        // Strip markdown formatting
        const clean = trimmed
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        // Truncate to ~155 chars at a word boundary
        const truncated = clean.length > 155 ? clean.substring(0, 155).replace(/\s+\S*$/, '') + '...' : clean;
        setFormData((prev) => ({ ...prev, excerpt: truncated }));
        return;
      }
    }
  }, [formData.content]);

  // Add FAQ template to content
  const handleAddFaq = useCallback(() => {
    const faqTemplate = `\n\n## Frequently Asked Questions\n\n### What makes this topic important for Walla Walla wine?\nExplain the connection between this geological feature and the wine region.\n\n### Where can visitors see evidence of this?\nDescribe locations or experiences where visitors can observe this.\n\n### How does this affect the wine grown here?\nExplain the practical impact on viticulture and wine character.`;
    setFormData((prev) => ({ ...prev, content: prev.content.trimEnd() + faqTemplate }));
    // Scroll textarea to bottom
    requestAnimationFrame(() => {
      const textarea = contentRef.current;
      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
        textarea.focus();
      }
    });
  }, []);

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      // Only auto-generate slug if it's a new topic or slug is empty
      slug: !isEditing || !prev.slug ? generateSlug(title) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const dataToSave = {
        ...formData,
        is_published: publish ? true : formData.is_published,
      };

      const url = isEditing
        ? `/api/admin/geology/topics/${initialData?.id}`
        : '/api/admin/geology/topics';

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save topic');
      }

      router.push('/admin/geology/topics');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this topic? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/geology/topics/${initialData?.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete topic');
      }

      router.push('/admin/geology/topics');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/admin/geology" className="text-gray-500 hover:text-gray-700">
              Geology
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/admin/geology/topics" className="text-gray-500 hover:text-gray-700">
              Topics
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{isEditing ? 'Edit' : 'New'}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Topic' : 'Create New Topic'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {showPreview ? (
        /* Preview Mode */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="max-w-3xl mx-auto">
            {formData.hero_image_url && (
              <img
                src={formData.hero_image_url}
                alt={formData.title}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}
            <h1 className="text-3xl font-bold text-gray-900">{formData.title || 'Untitled'}</h1>
            {formData.subtitle && (
              <p className="mt-2 text-xl text-gray-600">{formData.subtitle}</p>
            )}
            <div className="mt-6 prose prose-stone max-w-none">
              {/* Markdown rendering */}
              {formData.content.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-xl font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                if (line.trim().startsWith('- ')) {
                  return <li key={i} className="ml-4 mb-1 list-disc">{renderInlineMarkdown(line.trim().slice(2))}</li>;
                }
                return <p key={i} className="mb-4">{renderInlineMarkdown(line)}</p>;
              })}
            </div>
            {formData.sources && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 uppercase">Sources</h4>
                <p className="mt-2 text-sm text-gray-600">{formData.sources}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
          {/* Main Content Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., The Ice Age Floods That Shaped Walla Walla"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                required
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="A brief tagline or summary"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 text-sm mr-2">/geology/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="ice-age-floods"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Write or paste your article below. Use the formatting buttons to add headings, bold text, and lists.
                Click <strong>Preview</strong> (top right) to see how it will look to visitors.
              </p>
              <div className="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-[#722F37] focus-within:border-transparent overflow-hidden">
                <div className="px-3 pt-2 bg-gray-50 border-b border-gray-200">
                  <MarkdownToolbar
                    textareaRef={contentRef}
                    onContentChange={(content) => setFormData({ ...formData, content })}
                  />
                </div>
                <textarea
                  ref={contentRef}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write or paste your article here. You can use the toolbar above or type formatting directly.

## The Story Begins

About 15,000 years ago, massive floods carved through this land...

### The Evidence Today

The effects of these cataclysmic events are still visible in the **basalt cliffs** and *layered sediments* found throughout the valley.

- Basalt columns at Palouse Falls
- Flood deposits in vineyard soils
- Ancient lake bed formations"
                  rows={24}
                  className="w-full px-4 py-3 border-0 focus:ring-0 text-sm resize-y"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tip: Use the toolbar buttons above to format your text, or just write naturally and the system will handle the rest.
              </p>
            </div>

            {/* Excerpt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Summary (appears in search results)
                </label>
                {!formData.excerpt && formData.content.length > 50 && (
                  <button
                    type="button"
                    onClick={handleGenerateExcerpt}
                    className="text-xs text-[#722F37] hover:text-[#5a252c] font-medium"
                  >
                    Generate from article
                  </button>
                )}
              </div>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="A 1-2 sentence summary — this is what people see in Google search results"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                maxLength={160}
              />
              <p className={`text-xs mt-1 ${formData.excerpt.length > 160 ? 'text-red-500' : formData.excerpt.length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.excerpt.length}/160 characters {formData.excerpt.length >= 50 && formData.excerpt.length <= 160 ? '— ideal length' : formData.excerpt.length > 160 ? '— too long for search results' : '— aim for 50-160'}
              </p>
            </div>
          </div>

          {/* Search Visibility Score */}
          <ContentScorePanel
            formData={formData}
            onAddFaq={handleAddFaq}
            onGenerateExcerpt={handleGenerateExcerpt}
          />

          {/* Settings Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Topic Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.topic_type}
                  onChange={(e) => setFormData({ ...formData, topic_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                >
                  {TOPIC_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                >
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hero Image */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hero Image URL
                </label>
                <input
                  type="url"
                  value={formData.hero_image_url}
                  onChange={(e) => setFormData({ ...formData, hero_image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  placeholder="Kevin Pogue"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                />
              </div>

              {/* Sources */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sources / Citations
                </label>
                <textarea
                  value={formData.sources}
                  onChange={(e) => setFormData({ ...formData, sources: e.target.value })}
                  placeholder="List your sources for verification..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded border-gray-300 text-[#722F37] focus:ring-[#722F37]"
                />
                <span className="text-sm text-gray-700">Featured topic</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete Topic
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/geology/topics"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c] disabled:opacity-50"
              >
                {saving ? 'Publishing...' : formData.is_published ? 'Update & Publish' : 'Publish'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
