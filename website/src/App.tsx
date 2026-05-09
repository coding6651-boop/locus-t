import { Hero } from './components/Hero'
import { Features } from './components/Features'
import { HowItWorks } from './components/HowItWorks'
import { Architecture } from './components/Architecture'
import { Terminal } from './components/Terminal'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-black">
      <Hero />
      <Terminal />
      <Features />
      <HowItWorks />
      <Architecture />
      <Footer />
    </div>
  )
}
