import React from 'react';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';

const AntiCheatGuard: React.FC<{ examId: string; onReady: () => void }> = ({ examId, onReady }) => {
  const [step, setStep] = React.useState<'photo' | 'fullscreen' | 'done'>('photo');
  const [photoTaken, setPhotoTaken] = React.useState(false);
  const [error, setError] = React.useState('');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const user = useAuthStore((s) => s.user);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('无法访问摄像头，跳过拍照');
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach((t) => t.stop());
        setPhotoTaken(true);
      }
    }
  };

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // fullscreen not available
    }
    setStep('done');
    onReady();
  };

  React.useEffect(() => {
    if (step === 'photo') startCamera();
  }, [step]);

  if (step === 'done') return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 20 }}>
        {step === 'photo' && (
          <>
            <h3 style={{ marginBottom: 16 }}>考前身份拍照</h3>
            <p style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>请正对摄像头，点击拍照</p>
            <video ref={videoRef} style={{ width: 320, height: 240, background: '#000', borderRadius: 8, marginBottom: 12 }} />
            <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
            <br />
            {error && <p style={{ color: '#ff4d4f', fontSize: 13 }}>{error}</p>}
            <button onClick={takePhoto} disabled={photoTaken}
              style={{ padding: '8px 24px', background: photoTaken ? '#ccc' : '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, cursor: photoTaken ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}>
              {photoTaken ? '已拍照' : '拍照'}
            </button>
            {photoTaken && (
              <div style={{ marginTop: 12 }}>
                <button onClick={enterFullscreen}
                  style={{ padding: '8px 30px', background: '#52c41a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
                  进入全屏考试
                </button>
              </div>
            )}
            {error && !photoTaken && (
              <button onClick={enterFullscreen} style={{ padding: '8px 24px', marginTop: 12, background: '#999', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
                跳过，进入考试
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AntiCheatGuard;
