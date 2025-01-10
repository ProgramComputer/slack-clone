import { useRouter } from 'next/router';
import { FaRocket, FaComments, FaUserShield } from 'react-icons/fa';

const LandingPage = () => {
  const router = useRouter();

  const navigateToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white flex flex-col items-center justify-center">
        <h1 className="text-5xl font-bold mb-4">Welcome to ChatGenius</h1>
        <p className="text-xl mb-8">The intelligent cloud-based chatting app</p>
        <button
          onClick={navigateToLogin}
          className="bg-white text-indigo-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition"
        >
          Get Started
        </button>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">Features</h2>
          <div className="flex flex-wrap">
            <div className="w-full md:w-1/3 px-4 text-center">
              <FaRocket className="mx-auto text-6xl text-indigo-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Fast Performance</h3>
              <p className="text-gray-600">
                Experience lightning-fast messaging with our optimized cloud infrastructure.
              </p>
            </div>
            <div className="w-full md:w-1/3 px-4 text-center">
              <FaComments className="mx-auto text-6xl text-indigo-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Real-time Chatting</h3>
              <p className="text-gray-600">
                Communicate with your team and friends in real-time with instant updates.
              </p>
            </div>
            <div className="w-full md:w-1/3 px-4 text-center">
              <FaUserShield className="mx-auto text-6xl text-indigo-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                Your conversations are protected with end-to-end encryption.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Showcase Section */}
      <section className="bg-gray-100 py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">How It Works</h2>
          <div className="space-y-16">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 px-4">
                <h3 className="text-2xl font-semibold mb-2">1. Create an Account</h3>
                <p className="text-gray-600">
                  Sign up easily using your email or social accounts.
                </p>
              </div>
              <div className="md:w-1/2 px-4">
                <svg
                  className="w-full h-auto max-w-md mx-auto"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 14.5C15.3137 14.5 18 11.8137 18 8.5C18 5.18629 15.3137 2.5 12 2.5C8.68629 2.5 6 5.18629 6 8.5C6 11.8137 8.68629 14.5 12 14.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-indigo-600"
                  />
                  <path
                    d="M20 21.5H4C4 18.6066 7.58172 16.5 12 16.5C16.4183 16.5 20 18.6066 20 21.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-indigo-600"
                  />
                </svg>
              </div>
            </div>
            <div className="flex flex-col md:flex-row-reverse items-center">
              <div className="md:w-1/2 px-4">
                <h3 className="text-2xl font-semibold mb-2">2. Join Channels</h3>
                <p className="text-gray-600">
                  Explore public channels or create your own private groups.
                </p>
              </div>
              <div className="md:w-1/2 px-4">
                <svg
                  className="w-full h-auto max-w-md mx-auto"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-indigo-600"
                  />
                  <path
                    d="M12 7V12L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-indigo-600"
                  />
                  <path
                    d="M8 12H16"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-indigo-600"
                  />
                </svg>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 px-4">
                <h3 className="text-2xl font-semibold mb-2">3. Start Chatting</h3>
                <p className="text-gray-600">
                  Enjoy seamless communication with real-time messaging.
                </p>
              </div>
              <div className="md:w-1/2 px-4">
                <svg
                  className="w-full h-auto max-w-md mx-auto"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-indigo-600"
                  />
                  <path
                    d="M8 12C8 12.5523 7.55228 13 7 13C6.44772 13 6 12.5523 6 12C6 11.4477 6.44772 11 7 11C7.55228 11 8 11.4477 8 12Z"
                    fill="currentColor"
                    className="text-indigo-600"
                  />
                  <path
                    d="M12 12C12 12.5523 11.5523 13 11 13C10.4477 13 10 12.5523 10 12C10 11.4477 10.4477 11 11 11C11.5523 11 12 11.4477 12 12Z"
                    fill="currentColor"
                    className="text-indigo-600"
                  />
                  <path
                    d="M16 12C16 12.5523 15.5523 13 15 13C14.4477 13 14 12.5523 14 12C14 11.4477 14.4477 11 15 11C15.5523 11 16 11.4477 16 12Z"
                    fill="currentColor"
                    className="text-indigo-600"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-indigo-600 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to join ChatGenius?</h2>
          <p className="text-xl mb-6">Sign up now and start chatting instantly.</p>
          <button
            onClick={navigateToLogin}
            className="bg-white text-indigo-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-6 text-center">
          <p>© {new Date().getFullYear()} ChatGenius. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
