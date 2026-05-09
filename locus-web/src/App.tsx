import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Terminal } from './components/Terminal'
import { WhyLocus } from './components/WhyLocus'
import { HowItWorks } from './components/HowItWorks'
import { Features } from './components/Features'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <Terminal />
      <WhyLocus />
      <HowItWorks />
      <Features />
      <Footer />
    </div>
  )
}
