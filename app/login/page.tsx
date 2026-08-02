"use client";

import { useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./login.module.css";

function getFirebaseErrorCode(error: unknown) {
  return error instanceof FirebaseError ? error.code : "";
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPendingPopup, setShowPendingPopup] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    setReason(new URLSearchParams(window.location.search).get("reason"));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        await signOut(auth);
        setError("Account not found. Please register first.");
        return;
      }

      const userData = userDoc.data();

      if (userData.status === "pending") {
        await signOut(auth);
        setShowPendingPopup(true);
        return;
      }

      if (userData.role === "admin") {
        router.push("/admin/dashboard");
      } else if (userData.role === "organizer") {
        router.push("/organizer/feed");
      } else {
        router.push("/student/feed");
      }
    } catch (err: unknown) {
      switch (getFirebaseErrorCode(err)) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please wait a moment.");
          break;
        default:
          setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.ambient} aria-hidden="true">
          <div className={styles.glowOne} />
          <div className={styles.glowTwo} />
          <div className={styles.orbitOne} />
          <div className={styles.orbitTwo} />
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} className={styles.particle} />
          ))}
        </div>

        <header className={styles.header}>
          <a href="#top" className={styles.brand} aria-label="VolunTRY home">
            <Image
              src="/logo_2.png"
              alt="VolunTRY"
              width={1000}
              height={218}
              priority
            />
          </a>

          <nav className={styles.nav} aria-label="Landing page navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#why-voluntry">Why VolunTRY</a>
            <a href="#organizations">For organizations</a>
          </nav>

          <button 
            type="button" 
            className={styles.headerSignIn}
            onClick={() => {
              setIsShaking(true);
              setTimeout(() => setIsShaking(false), 400);
            }}
          >
            Sign in
            <ArrowIcon />
          </button>
        </header>

        <div className={styles.heroGrid} id="top">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Northern Cyprus volunteer community
            </span>
            <h1>
              Volunteer in Northern Cyprus
              <span> with VolunTRY.</span>
            </h1>

            <p className={styles.heroText}>
              Discover trusted volunteer opportunities across Northern Cyprus and
              Cyprus, join causes you care about, and keep every contribution in
              one place.
            </p>

            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryCta}>
                Start volunteering
                <ArrowIcon />
              </Link>
              <a href="#how-it-works" className={styles.secondaryCta}>
                See how it works
              </a>
            </div>

            <div className={styles.heroTrust} aria-label="Platform highlights">
              <div className={styles.trustAvatars} aria-hidden="true">
                <span>V</span>
                <span>T</span>
                <span>+</span>
              </div>
              <p>
                One profile for your <strong>events, points and certificates.</strong>
              </p>
            </div>
          </div>

          <div className={`${styles.loginStage} ${isShaking ? styles.highlightPop : ""}`} id="sign-in">
            <div className={styles.floatingCardTop} aria-hidden="true">
              <span className={styles.miniIcon}>
                <svg viewBox="0 0 24 24">
                  <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
                </svg>
              </span>
              <span>
                <small>Discover</small>
                New opportunities
              </span>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIntro}>
                <span className={styles.cardKicker}>WELCOME BACK</span>
                <h2>Continue your impact</h2>
                <p>Sign in to access your VolunTRY account.</p>
              </div>

              {reason === "timeout" && (
                <div className={styles.timeoutBox} role="status">
                  You were signed out due to inactivity.
                </div>
              )}

              {error && (
                <div className={styles.errorBox} role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="email">
                    Email address
                  </label>
                  <div className={styles.inputWrap}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="password">
                      Password
                    </label>
                    <Link href="/forgot-password" className={styles.forgotLink}>
                      Forgot password?
                    </Link>
                  </div>
                  <div className={styles.inputWrap}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="5" y="10" width="14" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className={`${styles.input} ${styles.passwordInput}`}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className={styles.button}>
                  <span>{loading ? "Signing in..." : "Sign in to VolunTRY"}</span>
                  {!loading && <ArrowIcon />}
                </button>
              </form>

              <p className={styles.registerText}>
                New to VolunTRY?{" "}
                <Link href="/register" className={styles.registerLink}>
                  Create an account
                </Link>
              </p>

              <div className={styles.cardDivider}>
                <span>or</span>
              </div>

              <Link href="/register/organization" className={styles.organizationLink}>
                <span className={styles.organizationIcon}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 21V8l8-5 8 5v13M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01" />
                  </svg>
                </span>
                <span>
                  <strong>Represent an organization?</strong>
                  <small>Create an organizer account</small>
                </span>
                <ArrowIcon />
              </Link>
            </div>

            <div className={styles.floatingCardBottom} aria-hidden="true">
              <span className={styles.checkIcon}>
                <svg viewBox="0 0 20 20">
                  <path d="m5 10 3 3 7-7" />
                </svg>
              </span>
              <span>
                <small>Your impact</small>
                Verified &amp; shareable
              </span>
            </div>
          </div>
        </div>

        <div className={styles.heroRail} aria-hidden="true">
          <span>DISCOVER</span>
          <i />
          <span>PARTICIPATE</span>
          <i />
          <span>MAKE AN IMPACT</span>
          <i />
          <span>BE RECOGNIZED</span>
        </div>
      </section>

      <section className={styles.howSection} id="how-it-works">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionKicker}>VOLUNTEERING IN CYPRUS</span>
          <h2>Find your next volunteer opportunity in Northern Cyprus.</h2>
          <p>
            VolunTRY makes Cyprus volunteering simple, visible and rewarding.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          <article className={styles.stepCard}>
            <div className={styles.stepTop}>
              <span className={styles.stepNumber}>01</span>
              <span className={styles.stepIcon}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4M8 11h6M11 8v6" />
                </svg>
              </span>
            </div>
            <h3>Discover your cause</h3>
            <p>
              Explore Northern Cyprus volunteer opportunities by date, location
              and field of interest.
            </p>
          </article>

          <article className={`${styles.stepCard} ${styles.featuredStep}`}>
            <div className={styles.stepTop}>
              <span className={styles.stepNumber}>02</span>
              <span className={styles.stepIcon}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 12.5 11 16l5-8M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" />
                </svg>
              </span>
            </div>
            <h3>Join and contribute</h3>
            <p>Apply to trusted events and follow your participation from one place.</p>
          </article>

          <article className={styles.stepCard}>
            <div className={styles.stepTop}>
              <span className={styles.stepNumber}>03</span>
              <span className={styles.stepIcon}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="6" />
                  <path d="m8 13-1 8 5-3 5 3-1-8" />
                </svg>
              </span>
            </div>
            <h3>Build your impact</h3>
            <p>Collect points, earn rewards and keep verified certificates.</p>
          </article>
        </div>
      </section>

      <section className={styles.valueSection} id="why-voluntry">
        <div className={styles.valueVisual}>
          <div className={styles.visualGlow} />
          <div className={styles.dashboardMockup}>
            <div className={styles.mockupHeader}>
              <div>
                <span />
                <span />
                <span />
              </div>
              <small>MY IMPACT</small>
            </div>
            <div className={styles.mockupBody}>
              <div className={styles.profileLine}>
                <div className={styles.profileAvatar}>V</div>
                <div>
                  <strong>Volunteer profile</strong>
                  <span>Everything you achieve, together.</span>
                </div>
              </div>
              <div className={styles.mockupStats}>
                <div>
                  <span className={styles.statIconGreen}>
                    <svg viewBox="0 0 24 24"><path d="M12 3v18M8 7h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6" /></svg>
                  </span>
                  <small>POINTS</small>
                  <strong>Grow with every event</strong>
                </div>
                <div>
                  <span className={styles.statIconGold}>
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5" /><path d="m8 12-1 9 5-3 5 3-1-9" /></svg>
                  </span>
                  <small>REWARDS</small>
                  <strong>Celebrate your effort</strong>
                </div>
              </div>
              <div className={styles.certificateRow}>
                <span className={styles.certificateIcon}>
                  <svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6M9 16h4" /></svg>
                </span>
                <div>
                  <small>LATEST CERTIFICATE</small>
                  <strong>Verified contribution</strong>
                </div>
                <span className={styles.verifiedPill}>Verified</span>
              </div>
            </div>
          </div>
          <div className={styles.qrCard}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-2zM14 18h2v2h-2z" />
            </svg>
            <span>
              <small>QR VERIFIED</small>
              Trusted certificates
            </span>
          </div>
        </div>

        <div className={styles.valueCopy}>
          <span className={styles.sectionKicker}>KIBRIS GÖNÜLLÜ TOPLULUĞU</span>
          <h2>Kıbrıs&apos;ta gönüllülük, tek bir platformda.</h2>
          <p className={styles.valueLead}>
            VolunTRY ile Kuzey Kıbrıs gönüllülük etkinliklerini keşfedin,
            topluma katkı sağlayın ve katılımınızı doğrulanabilir
            sertifikalarla kaydedin. Kıbrıs gönüllü topluluğunu öğrenciler
            ve organizasyonlarla buluşturuyoruz.
          </p>

          <div className={styles.valueList}>
            <div>
              <span>
                <svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" /></svg>
              </span>
              <p><strong>A living impact profile</strong>Keep your applications, participation and progress together.</p>
            </div>
            <div>
              <span>
                <svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" /></svg>
              </span>
              <p><strong>Recognition that follows you</strong>Earn points, rewards and QR-verifiable certificates.</p>
            </div>
            <div>
              <span>
                <svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" /></svg>
              </span>
              <p><strong>A community with momentum</strong>See completed work and celebrate shared impact in the feed.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.organizerSection} id="organizations">
        <div className={styles.organizerInner}>
          <div className={styles.organizerCopy}>
            <span className={styles.organizerKicker}>FOR ORGANIZATIONS</span>
            <h2>Reach volunteers across Northern Cyprus.</h2>
            <p>
              Publish volunteer opportunities in Cyprus, manage applications,
              follow attendance and gather feedback through one focused workspace.
            </p>
            <Link href="/register/organization" className={styles.lightCta}>
              Register your organization
              <ArrowIcon />
            </Link>
          </div>

          <div className={styles.organizerFeatures}>
            <div>
              <span>01</span>
              <p><strong>Publish opportunities</strong>Reach students ready to contribute.</p>
            </div>
            <div>
              <span>02</span>
              <p><strong>Manage participation</strong>Keep applicants and attendance organized.</p>
            </div>
            <div>
              <span>03</span>
              <p><strong>Show the outcome</strong>Collect feedback and share completed work.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span className={styles.sectionKicker}>YOUR NEXT STEP CAN MATTER</span>
          <h2>Find your place in something bigger.</h2>
        </div>
        <Link href="/register" className={styles.primaryCta}>
          Create your volunteer account
          <ArrowIcon />
        </Link>
      </section>

      <footer className={styles.footer}>
        <Image src="/logo_2.png" alt="VolunTRY" width={1000} height={218} />
        <p>Connecting people, purpose and measurable impact.</p>
        <a href="#top">Back to top</a>
      </footer>

      {showPendingPopup && (
        <div className={styles.popupOverlay} role="dialog" aria-modal="true" aria-labelledby="pending-title">
          <div className={styles.popup}>
            <div className={styles.popupIcon}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
            <h2 id="pending-title">Account pending</h2>
            <p>
              Your account is still on the Ministry&apos;s <strong>pending approval</strong> list.
            </p>
            <small>
              An administrator has not approved your registration yet. Please check back later.
            </small>
            <button type="button" onClick={() => setShowPendingPopup(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
