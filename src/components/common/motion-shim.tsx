/**
 * 动画组件
 * 基于 CSS 的轻量级动画解决方案
 */
import React, { CSSProperties } from 'react';

// 动画配置
const defaultTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1], // cubic-bezier
};

// 基础动画组件
interface MotionProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  initial?: CSSProperties | boolean;
  animate?: CSSProperties | boolean;
  exit?: CSSProperties | boolean;
  transition?: {
    duration?: number;
    ease?: number[];
    delay?: number;
  };
  whileHover?: CSSProperties;
  whileTap?: CSSProperties;
  className?: string;
}

/**
 * 动画 Div 组件
 */
export const motion: React.FC<MotionProps> = ({
  children,
  initial,
  animate,
  transition,
  className = '',
  style,
  ...rest
}) => {
  const motionStyle: CSSProperties = {};
  
  // 处理 initial 状态
  if (initial === true) {
    motionStyle.opacity = 1;
  } else if (initial && typeof initial === 'object') {
    Object.assign(motionStyle, initial);
  }
  
  // 构建 transition 字符串
  let transitionStr = 'all';
  if (transition) {
    const duration = transition.duration || 0.3;
    const ease = transition.ease ? `cubic-bezier(${transition.ease.join(',')})` : 'cubic-bezier(0.4, 0, 0.2, 1)';
    const delay = transition.delay ? `${transition.delay}s` : '';
    transitionStr = `all ${duration}s ${ease} ${delay}`.trim();
  } else {
    transitionStr = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }
  
  const combinedStyle: CSSProperties = {
    ...style,
    ...motionStyle,
    transition: transitionStr,
  };

  // 如果有 animate 属性
  if (animate && typeof animate === 'object') {
    // 使用 CSS 动画 keyframes
    const keyframes = `
      @keyframes motionFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    return (
      <>
        <style>{keyframes}</style>
        <div 
          {...rest}
          className={className}
          style={{
            ...combinedStyle,
            animation: 'motionFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
          }}
        >
          {children}
        </div>
      </>
    );
  }

  return (
    <div {...rest} className={className} style={combinedStyle}>
      {children}
    </div>
  );
};

// 常用动画变体
export const variants = {
  // 淡入
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  // 从下方淡入
  fadeInUp: {
    initial: { opacity: 0, transform: 'translateY(20px)' },
    animate: { opacity: 1, transform: 'translateY(0)' },
  },
  // 从上方淡入
  fadeInDown: {
    initial: { opacity: 0, transform: 'translateY(-20px)' },
    animate: { opacity: 1, transform: 'translateY(0)' },
  },
  // 缩放淡入
  scaleIn: {
    initial: { opacity: 0, transform: 'scale(0.9)' },
    animate: { opacity: 1, transform: 'scale(1)' },
  },
};

/**
 * 动画过渡组件
 */
export const MotionDiv: React.FC<MotionProps> = ({ 
  children, 
  initial, 
  animate, 
  transition,
  className,
  style,
  ...rest 
}) => {
  const baseStyle: CSSProperties = {
    ...(typeof initial === 'object' ? initial : {}),
    transition: transition ? 
      `all ${transition.duration || 0.3}s cubic-bezier(${((transition.ease || [0.4, 0, 0.2, 1])).join(',')})` :
      'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div 
      {...rest}
      className={className}
      style={{ ...baseStyle, ...style }}
    >
      {children}
    </div>
  );
};

/**
 * AnimatePresence 替代方案
 * 使用 CSS keyframes
 */
export const AnimatePresence: React.FC<{
  children?: React.ReactNode;
  mode?: 'sync' | 'wait';
  initial?: boolean;
}> = ({ children, mode = 'sync', initial = true }) => {
  if (!initial) return <>{children}</>;
  
  // 简单的进入动画
  const style: CSSProperties = {
    animation: 'fadeIn 0.3s ease-out',
  };
  
  const keyframes = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  
  return (
    <>
      <style>{keyframes}</style>
      <div style={style}>{children}</div>
    </>
  );
};

export default motion;
