import { useState } from 'react'
import { supabase } from 'lib/Store'
import tailwindConfig from '../tailwind.config.js';

const Home = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')

  // Determine if the input is an email
  const isEmail = usernameOrEmail.includes('@')

  const handleLogin = async (type) => {
    try {
      let error, user

      if (isEmail) {
        // Email/password authentication
        if (type === 'LOGIN') {
          ({ data: { user }, error } = await supabase.auth.signInWithPassword({
            email: usernameOrEmail,
            password,
          }))
        } else if (type === 'SIGNUP') {
          ({ data: { user }, error } = await supabase.auth.signUp({
            email: usernameOrEmail,
            password,
            email_confirm: true,
          }))
        }
      } else {
        // Anonymous sign-in with username
        ({ data: { user }, error } = await supabase.auth.signInAnonymously())
        if (user) {
          // Update the user's profile with the username
          const { error: updateError } = await supabase.from('users').upsert({
            id: user.id,
            username: usernameOrEmail,
          })
          if (updateError) {
            alert('Error updating user profile: ' + updateError.message)
          }
        }
      }

      if (error) {
        alert('Error with auth: ' + error.message)
      } else if (!user && type === 'SIGNUP') {
        alert('Signup successful, confirmation mail should be sent soon!')
      }
    } catch (error) {
      console.log('error', error)
      alert(error.error_description || error.message)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slack-sidebar">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-slack-text">Sign in to Workspace</h2>
        <div className="mb-4">
          <label className="font-bold text-grey-darker block mb-2">
            {isEmail ? 'Email' : 'Username'}
          </label>
          <input
            type="text"
            className="block appearance-none w-full bg-white border border-grey-light hover:border-grey px-2 py-2 rounded shadow"
            placeholder="Your Email or Username"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
          />
        </div>
        {isEmail && (
          <div className="mb-6">
            <label className="block text-slack-text mb-2">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-slack-border rounded focus:outline-none focus:border-slack-accent"
              placeholder="Your Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.preventDefault()
              handleLogin(isEmail ? 'LOGIN' : 'ANONYMOUS')
            }}
            className="bg-indigo-700 hover:bg-indigo-600 text-white py-2 px-4 rounded text-center transition duration-150"
          >
            {isEmail ? 'Login with Email' : 'Sign in Anonymously'}
          </button>
          {isEmail && (
            <button
              onClick={(e) => {
                e.preventDefault()
                handleLogin('SIGNUP')
              }}
              className="border border-indigo-700 text-indigo-700 py-2 px-4 rounded w-full text-center transition duration-150 hover:bg-indigo-700 hover:text-white"
            >
              Sign up
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
