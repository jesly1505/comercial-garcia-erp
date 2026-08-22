import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';
import api from '../../services/api';
import styles from './Login.module.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { identifier: email, password });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Credenciales inválidas');
      } else {
        setError('Error de conexión con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContent}>
      
      <div className={styles.logoContainer}>
        <Crown size={42} color="#c59b6d" fill="#c59b6d" className={styles.crownIcon} />
        <div className={styles.logoTextBig}>
          <span className={styles.letterG}>G</span>
          <span className={styles.letterR}>R</span>
        </div>
        <div className={styles.logoTextSmall}>
          <span className={styles.comercialText}>COMERCIAL</span>
          <br />
          <span className={styles.garciaText}>GARCÍA REYES S.A.</span>
        </div>
        <div className={styles.goldLine}></div>
      </div>

      <h2 className={styles.title}>Iniciar Sesión</h2>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="email">Usuario</label>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ingrese su usuario"
              required
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">Contraseña</label>
          <div className={styles.inputWrapper}>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              required
            />
            <Lock className={styles.inputIcon} size={18} />
          </div>
        </div>

        <div className={styles.optionsRow}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" />
            <span>Recuérdame</span>
          </label>
          <a href="#" className={styles.forgotLink}>¿Olvidaste tu contraseña?</a>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
        
        <div className={styles.footerText}>
          © 2026 Comercial García Reyes S.A.
        </div>
      </form>
    </div>
  );
};

export default Login;
