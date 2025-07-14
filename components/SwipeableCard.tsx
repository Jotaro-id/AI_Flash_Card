import {
  motion,
  useMotionValue,
  useTransform,
  useAnimationControls,
  PanInfo,
} from 'framer-motion';
import { ReactNode, useEffect } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipe: (direction: SwipeDirection) => void;
  disabled?: boolean;
  wordId?: string; // カードが変わったことを検知するため
}

const SWIPE_THRESHOLD_X = 50;  // 左右スワイプの閾値（px）
const SWIPE_THRESHOLD_Y = 40;  // 上スワイプの閾値（px）

export function SwipeableCard({ children, onSwipe, disabled = false, wordId }: SwipeableCardProps) {
  // ドラッグ中の座標を追跡
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimationControls();

  // カードが変わったときに位置をリセット
  useEffect(() => {
    controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 });
    x.set(0);
    y.set(0);
  }, [wordId, controls, x, y]);

  // xの値に応じて回転を計算
  const rotate = useTransform(x, [-150, 150], [-20, 20]);
  
  // ドラッグ中の背景色のオーバーレイ透明度
  const rightOverlayOpacity = useTransform(x, [0, 50], [0, 0.4]);
  const leftOverlayOpacity = useTransform(x, [-50, 0], [0.4, 0]);
  const upOverlayOpacity = useTransform(y, [-40, 0], [0.4, 0]);

  // ドラッグ終了時の処理
  const handleDragEnd = async (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (disabled) return;

    // 速度も考慮に入れる（速い動きは小さい移動でもスワイプと判定）
    const velocityThreshold = 500;

    // 上スワイプを最優先で判定
    if ((info.offset.y < -SWIPE_THRESHOLD_Y || (info.velocity.y < -velocityThreshold && info.offset.y < 0)) 
        && Math.abs(info.offset.x) < SWIPE_THRESHOLD_X) {
      // 上スワイプ（怪しい）
      await controls.start({ y: -500, opacity: 0 });
      onSwipe('up');
      // アニメーション完了後、カードを元の位置に戻す（次のカード用）
      await controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 });
    } else if (info.offset.x > SWIPE_THRESHOLD_X || (info.velocity.x > velocityThreshold && info.offset.x > 0)) {
      // 右スワイプ（覚えた）
      await controls.start({ x: 500, opacity: 0, rotate: 30 });
      onSwipe('right');
      // アニメーション完了後、カードを元の位置に戻す（次のカード用）
      await controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 });
    } else if (info.offset.x < -SWIPE_THRESHOLD_X || (info.velocity.x < -velocityThreshold && info.offset.x < 0)) {
      // 左スワイプ（覚えていない）
      await controls.start({ x: -500, opacity: 0, rotate: -30 });
      onSwipe('left');
      // アニメーション完了後、カードを元の位置に戻す（次のカード用）
      await controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 });
    } else {
      // スワイプされなかった場合、元の位置に戻す
      await controls.start({ x: 0, y: 0, rotate: 0 });
    }
  };

  return (
    <motion.div
      className="relative"
      drag={!disabled}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      style={{ x, y, rotate }}
      animate={controls}
      onDragEnd={handleDragEnd}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* 右スワイプ時の緑色オーバーレイ */}
      <motion.div
        className="absolute inset-0 bg-green-500 rounded-2xl pointer-events-none"
        style={{ opacity: rightOverlayOpacity }}
      />
      
      {/* 左スワイプ時の赤色オーバーレイ */}
      <motion.div
        className="absolute inset-0 bg-red-500 rounded-2xl pointer-events-none"
        style={{ opacity: leftOverlayOpacity }}
      />
      
      {/* 上スワイプ時の黄色オーバーレイ */}
      <motion.div
        className="absolute inset-0 bg-yellow-500 rounded-2xl pointer-events-none"
        style={{ opacity: upOverlayOpacity }}
      />
      
      {/* カードコンテンツ */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* スワイプ方向インジケーター */}
      <motion.div
        className="absolute top-4 right-4 text-green-500 font-bold text-2xl pointer-events-none"
        style={{ opacity: rightOverlayOpacity, scale: useTransform(rightOverlayOpacity, [0, 0.3], [0.5, 1]) }}
      >
        覚えた！
      </motion.div>
      
      <motion.div
        className="absolute top-4 left-4 text-red-500 font-bold text-2xl pointer-events-none"
        style={{ opacity: leftOverlayOpacity, scale: useTransform(leftOverlayOpacity, [0, 0.3], [0.5, 1]) }}
      >
        覚えていない
      </motion.div>
      
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 text-yellow-500 font-bold text-2xl pointer-events-none"
        style={{ opacity: upOverlayOpacity, scale: useTransform(upOverlayOpacity, [0, 0.3], [0.5, 1]) }}
      >
        怪しい
      </motion.div>
    </motion.div>
  );
}