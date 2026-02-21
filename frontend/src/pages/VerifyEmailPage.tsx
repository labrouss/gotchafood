import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Επαλήθευση email...');

    const token = searchParams.get('token');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Λείπει το διακριτικό επαλήθευσης (token).');
                return;
            }

            try {
                const response = await authAPI.verifyEmail(token);
                if (response.success) {
                    setStatus('success');
                    setMessage('Το email σας επαληθεύτηκε επιτυχώς!');
                    // Optionally redirect after a few seconds
                    setTimeout(() => navigate('/login'), 3000);
                } else {
                    setStatus('error');
                    setMessage(response.message || 'Η επαλήθευση απέτυχε.');
                }
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Παρουσιάστηκε σφάλμα κατά την επαλήθευση.');
            }
        };

        verify();
    }, [token, navigate]);

    return (
        <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                        <h2 className="text-2xl font-bold text-gray-800">{message}</h2>
                        <p className="text-gray-500">Παρακαλώ περιμένετε μια στιγμή...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                            <span className="text-4xl">✅</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800">Συγχαρητήρια!</h2>
                        <p className="text-lg text-green-600 font-medium">{message}</p>
                        <p className="text-gray-500">Μεταφέρεστε στη σελίδα σύνδεσης...</p>
                        <Link
                            to="/login"
                            className="inline-block mt-4 text-primary font-semibold hover:underline"
                        >
                            Μετάβαση στη σύνδεση τώρα
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                            <span className="text-4xl">❌</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Η επαλήθευση απέτυχε</h2>
                        <p className="text-red-500 font-medium">{message}</p>
                        <div className="flex flex-col gap-3 mt-6">
                            <Link
                                to="/register"
                                className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
                            >
                                Επιστροφή στην εγγραφή
                            </Link>
                            <Link
                                to="/"
                                className="text-gray-600 hover:text-gray-800 transition"
                            >
                                Επιστροφή στην αρχική
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
