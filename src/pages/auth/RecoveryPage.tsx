import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export function RecoveryPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      toast(`Error: ${error.message}`, 'error');
    } else {
      setSent(true);
      toast('Se envió el enlace de recuperación', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-[#020B1A] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00BFFF]/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00BFFF] to-[#0066AA] items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,191,255,0.3)]">
            <Film className="w-8 h-8 text-[#020B1A]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
          <p className="text-white/50 text-sm mt-1">Te enviaremos un enlace para restablecerla</p>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-white/70 mb-4">
                Hemos enviado un enlace de recuperación a <span className="text-[#00BFFF]">{email}</span>.
                Revisa tu correo electrónico.
              </p>
              <Link to="/login" className="btn-primary inline-block">Volver a iniciar sesión</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-11"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-[#0e2a4d]">
            <Link to="/login" className="text-[#00BFFF] hover:text-[#33CCFF] text-sm flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
