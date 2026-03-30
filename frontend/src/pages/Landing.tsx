import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, Shield, Users, Pill, ArrowRight, CheckCircle2, Clock, BarChart3, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">MediMate</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="font-medium">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center relative">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Trusted medication adherence platform
            </div>
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance max-w-4xl mx-auto leading-[1.1]">
            Stay on top of medicines.{' '}
            <span className="text-primary">Together.</span>
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            MediMate helps patients, caregivers, and providers manage medication schedules,
            track adherence, and prevent refill gaps — in one shared care system.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="font-semibold text-base px-8 h-12">
                Get started free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="font-semibold text-base px-8 h-12">
                Sign in to your account
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold">Built for everyone in the care circle</h2>
            <p className="mt-3 text-muted-foreground text-lg">Different roles, one shared goal — better medication outcomes.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Pill, title: 'For Patients',
                desc: 'See your medicine schedule clearly. Mark doses as taken or skipped. Get refill reminders before you run out.',
                features: ['Simple daily schedule', 'One-tap dose tracking', 'Refill alerts'],
              },
              {
                icon: Users, title: 'For Caregivers',
                desc: 'Monitor loved ones\' medication adherence. Get alerts on missed doses and upcoming refills.',
                features: ['Multi-patient view', 'Missed dose alerts', 'Refill risk visibility'],
              },
              {
                icon: Shield, title: 'For Providers',
                desc: 'View patient adherence summaries. Identify at-risk patients. Make informed clinical decisions.',
                features: ['Adherence dashboards', 'Risk identification', 'Patient summaries'],
              },
            ].map((card, i) => (
              <motion.div key={card.title} variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true }} custom={i}
                className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="rounded-xl bg-primary/10 p-3 w-fit mb-5">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                <p className="text-muted-foreground mb-5">{card.desc}</p>
                <ul className="space-y-2">
                  {card.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold">How MediMate works</h2>
            <p className="mt-3 text-muted-foreground text-lg">Get started in minutes. Stay on track for months.</p>
          </div>
          <div className="grid sm:grid-cols-4 gap-8">
            {[
              { icon: Users, step: '1', title: 'Create your profile', desc: 'Sign up and choose your role — patient, caregiver, or provider.' },
              { icon: Pill, step: '2', title: 'Add medications', desc: 'Enter prescriptions and set up daily schedules with reminders.' },
              { icon: Clock, step: '3', title: 'Track adherence', desc: 'Log doses, view progress, and stay aware of refill timelines.' },
              { icon: BarChart3, step: '4', title: 'Share & review', desc: 'Caregivers and providers get visibility into adherence and risks.' },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true }} custom={i} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Built for trust and safety</h2>
          <p className="text-muted-foreground text-lg mb-10">
            MediMate is designed as a secure, role-based platform. Your health data stays private and accessible only to those you authorize.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Role-based access', desc: 'Each user sees only what they need. Permissions are enforced at every level.' },
              { icon: Smartphone, title: 'API-first architecture', desc: 'Secure REST APIs with JWT authentication. Ready for mobile and integrations.' },
              { icon: Heart, title: 'Patient-centered design', desc: 'Clear schedules, simple actions, and calm interfaces for all age groups.' },
            ].map((item) => (
              <div key={item.title} className="bg-card rounded-xl p-6 border border-border">
                <item.icon className="h-6 w-6 text-primary mb-3 mx-auto" />
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to simplify medication management?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join MediMate and bring clarity to your care routine.
          </p>
          <Link to="/register">
            <Button size="lg" className="font-semibold text-base px-10 h-12">
              Get started now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">MediMate</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MediMate. A medication adherence platform for better care outcomes.
          </p>
        </div>
      </footer>
    </div>
  );
}
