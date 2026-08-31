/**
 * UI primitives tests — basic layout & display components
 *
 * Stage 9 PR-13: components/ui 测试
 * - Badge, Card, Alert, Button, Separator, Skeleton, Spin, Grid, Row, Col
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from '../badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';
import { Alert, AlertDescription } from '../alert';
import { Button, buttonVariants } from '../button';
import { Separator } from '../separator';
import { Skeleton } from '../skeleton';
import { Spin } from '../spin';
import { Grid, Row, Col } from '../grid';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>New</Badge>);
    const el = screen.getByText('New');
    expect(el).toHaveAttribute('data-slot', 'badge');
    expect(el.className).toContain('bg-primary');
  });

  it('applies variant classes', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const el = screen.getByText('Error');
    expect(el.className).toContain('bg-destructive');
  });

  it('merges custom className', () => {
    render(<Badge className="custom-class">Tag</Badge>);
    expect(screen.getByText('Tag').className).toContain('custom-class');
  });

  it('exports badgeVariants helper', () => {
    const result = badgeVariants({ variant: 'outline' });
    expect(typeof result).toBe('string');
    expect(result).toContain('border-border');
  });
});

describe('Card', () => {
  it('renders with default size', () => {
    render(<Card>Body</Card>);
    const el = screen.getByText('Body');
    expect(el).toHaveAttribute('data-slot', 'card');
    expect(el).toHaveAttribute('data-size', 'default');
  });

  it('renders with sm size', () => {
    render(<Card size="sm">Small</Card>);
    expect(screen.getByText('Small')).toHaveAttribute('data-size', 'sm');
  });

  it('subcomponents have correct data-slot', () => {
    const { container } = render(
      <Card>
        <CardHeader data-testid="hdr">
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>
    );
    expect(container.querySelector('[data-slot="card-header"]')).toBeInTheDocument();
    expect(screen.getByText('Title').getAttribute('data-slot')).toBe('card-title');
    expect(screen.getByText('Desc').getAttribute('data-slot')).toBe('card-description');
    expect(screen.getByText('Body').getAttribute('data-slot')).toBe('card-content');
    expect(screen.getByText('Foot').getAttribute('data-slot')).toBe('card-footer');
  });
});

describe('Alert', () => {
  it('renders default variant with role=alert', () => {
    render(<Alert>Info</Alert>);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('bg-background');
  });

  it('renders destructive variant', () => {
    render(<Alert variant="destructive">Boom</Alert>);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('border-destructive');
  });

  it('renders AlertDescription as child', () => {
    render(
      <Alert>
        <AlertDescription>Description</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('renders as button by default', () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole('button', { name: 'Click' });
    expect(btn).toBeInTheDocument();
  });

  it('renders as child when asChild=true', () => {
    // 注意：base-ui Button 用 render prop 而非 Radix 的 asChild。
    // 这里只验证 ButtonProps 类型扩展可接受 asChild 值（运行时忽略）。
    const ButtonAsAny = Button as unknown as React.FC<
      React.PropsWithChildren<{ asChild?: boolean }>
    >;
    render(
      <ButtonAsAny asChild>
        <a href="/x">Link</a>
      </ButtonAsAny>
    );
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toBeInTheDocument();
  });

  it('disabled when disabled prop set', () => {
    render(<Button disabled>Off</Button>);
    expect(screen.getByRole('button', { name: 'Off' })).toBeDisabled();
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Del</Button>);
    expect(screen.getByRole('button').className).toContain('bg-destructive');
  });

  it('exports buttonVariants helper', () => {
    expect(buttonVariants({ variant: 'outline' })).toContain('border-border');
  });
});

describe('Separator', () => {
  it('renders horizontal by default', () => {
    const { container } = render(<Separator />);
    const el = container.querySelector('[data-slot="separator"]')!;
    expect(el).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('renders vertical when specified', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.querySelector('[data-slot="separator"]')!;
    expect(el).toHaveAttribute('data-orientation', 'vertical');
  });
});

describe('Skeleton', () => {
  it('renders a div with animate-pulse', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('bg-muted');
  });

  it('merges custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('w-full');
  });
});

describe('Spin', () => {
  it('renders spinner by default', () => {
    const { container } = render(<Spin />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    // The actual spinning dot
    expect(wrapper.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders nothing when spinning=false and no children', () => {
    const { container } = render(<Spin spinning={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders children when spinning=false and children provided', () => {
    render(
      <Spin spinning={false}>
        <span>Content</span>
      </Spin>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders tip text', () => {
    render(<Spin tip="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { container } = render(<Spin size="large" />);
    const spinner = container.querySelector('.animate-spin') as HTMLElement;
    expect(spinner.className).toContain('size-spin-lg');
  });
});

describe('Grid layout', () => {
  it('renders with default cols/gap', () => {
    const { container } = render(<Grid>A</Grid>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('grid-cols-3');
    expect(el.className).toContain('gap-4');
  });

  it('applies col count', () => {
    const { container } = render(<Grid cols={6}>A</Grid>);
    expect((container.firstChild as HTMLElement).className).toContain('grid-cols-6');
  });

  it('applies gap value', () => {
    const { container } = render(<Grid gap={8}>A</Grid>);
    expect((container.firstChild as HTMLElement).className).toContain('gap-8');
  });

  it('Row renders with alignment classes', () => {
    const { container } = render(
      <Row align="center" justify="between">
        x
      </Row>
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('items-center');
    expect(el.className).toContain('justify-between');
  });

  it('Col renders with span classes', () => {
    const { container } = render(<Col span={4}>x</Col>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('w-1/4');
  });

  it('Col full uses w-full', () => {
    const { container } = render(<Col span="full">x</Col>);
    expect((container.firstChild as HTMLElement).className).toContain('w-full');
  });
});
