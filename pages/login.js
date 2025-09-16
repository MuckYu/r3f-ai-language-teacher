// pages/login.js
'use client';
import React, { useState } from 'react';

const Login = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_PASSWORD) {
      setIsSuccess(true);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {isSuccess ? (
          <div style={styles.successMessage}>
            <p>✅ Success! You're being redirected.</p>
          </div>
        ) : (
          <>
            <h1 style={styles.heading}>Password Protected</h1>
            <p style={styles.text}>Please enter the password to continue.</p>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={styles.input}
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={styles.showButton}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button type="submit" style={styles.button}>
                Unlock
              </button>
            </form>
            {error && <p style={styles.errorText}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: 'sans-serif',
  },
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '400px',
  },
  heading: {
    fontSize: '2rem',
    color: '#333',
    marginBottom: '0.5rem',
  },
  text: {
    color: '#666',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #ccc',
    borderRadius: '4px',
    marginBottom: '1rem',
    paddingRight: '0.5rem',
  },
  input: {
    flex: '1',
    padding: '0.75rem',
    border: 'none',
    fontSize: '1rem',
    outline: 'none',
  },
  showButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#0070f3',
    fontSize: '0.875rem',
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
  },
  button: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#0070f3',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  errorText: {
    color: 'red',
    marginTop: '1rem',
  },
  successMessage: {
    padding: '2rem',
    fontSize: '1.25rem',
    color: '#0070f3',
    fontWeight: 'bold',
  },
};

export default Login;