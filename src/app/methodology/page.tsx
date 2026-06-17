import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Methodology · Oshin" };

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mono my-2 overflow-x-auto rounded-sm border border-line bg-panel2 px-3 py-2 text-[13px] text-fg">
      {children}
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-line py-6">
      <h2 className="text-base font-semibold uppercase tracking-[0.08em] text-accent">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold text-fg">Methodology</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Every number on this terminal is defensible. This page walks the math the way you&apos;d
        defend it to a quant: the risk-neutral density, the expected move, the edge, the
        non-negotiable risk-neutral-vs-real-world distinction, sizing, and calibration.
      </p>

      <Section id="thesis" title="The thesis">
        <p>
          Every research tool ships a <em>number</em> where the honest answer is a{" "}
          <em>distribution</em>: a consensus mean, a price target, a single-scenario DCF. That is
          the opposite of how a derivatives desk thinks. Oshin flips the unit of research from a
          point estimate to a probability distribution, frames every view as expected value, and
          does the one thing fundamental tools don&apos;t: it puts the analyst&apos;s distribution
          and the options market&apos;s implied distribution on the same axis and quantifies the gap
          as edge.
        </p>
      </Section>

      <Section id="rnd" title="The risk-neutral density (Breeden-Litzenberger)">
        <p>
          The risk-neutral density of the terminal price is the discounted second derivative of the
          call price with respect to strike:
        </p>
        <Formula>{`q(K) = e^(rT) · ∂²C/∂K²`}</Formula>
        <p>
          It is model-free: it holds for any underlying process under no-arbitrage with European
          options. A useful corollary gives the market&apos;s odds at every price directly from the
          call-price slope:
        </p>
        <Formula>{`P(S_T > K) = 1 + e^(rT) · ∂C/∂K`}</Formula>
        <p>
          Intuition worth saying out loud: a long butterfly pays a narrow band around a strike, so
          its price <em>is</em> the probability mass there. The discrete density we plot is exactly a
          butterfly spread:
        </p>
        <Formula>{`q(K) ≈ e^(rT) · [C(K−ΔK) − 2·C(K) + C(K+ΔK)] / ΔK²`}</Formula>
        <p>
          We do <strong>not</strong> differentiate raw quotes, they&apos;re too noisy to survive two
          derivatives and yield ~50% negative densities. Instead we follow Shimko (1993):
        </p>
        <ol className="ml-4 list-decimal space-y-1">
          <li>For each strike, take the liquid out-of-the-money option (put below the forward, call above) and recompute its implied vol from the mid. IV is identical for a call and put at the same strike under put-call parity, so OTM quotes stitch into one clean smile.</li>
          <li>Fit a natural cubic spline to IV-vs-strike, evaluated on a fine grid.</li>
          <li>Reprice a smooth call curve via Black-Scholes using the fitted IVs.</li>
          <li>Take the discrete butterfly second difference above.</li>
          <li>Beyond the observed strikes we hold IV flat at the wing value, extending the density with lognormal-style tails, then renormalize so it integrates to ~1. (Figlewski grafts parametric GEV tails for more precision; flat-IV extension is the simpler choice we disclose here.)</li>
        </ol>
        <p>
          A correct density is non-negative, integrates to ~1, and its mean sits on the forward. The
          terminal surfaces those diagnostics; warnings appear when truncation or smile noise pushes
          them out of tolerance.
        </p>
      </Section>

      <Section id="expected-move" title="Expected move">
        <p>Two methods that reconcile, so the work is checkable:</p>
        <Formula>{`IV method:        EM = S · IV · √(DTE/365)
Straddle method:  EM ≈ 0.85 × ATM straddle price`}</Formula>
        <p>
          They agree via Brenner-Subrahmanyam (each ATM option ≈ 0.4·S·σ·√T, so the straddle ≈
          0.8·S·σ·√T). We quote the 0.85 practitioner multiplier desks actually use, distinct from
          the theoretical EM ≈ 1.25 × straddle, which answers the inverse question. For a catalyst we
          isolate the move with the first expiry just after the event and surface the IV-crush
          estimate: the mechanical 30–50% overnight IV collapse that can sink a correct directional
          call held in long premium.
        </p>
      </Section>

      <Section id="edge" title="Edge & expected value">
        <p>We replace &quot;price target = $X&quot; with the expected value under the analyst&apos;s density:</p>
        <Formula>{`EV = ∫ payoff(S_T) · f_subjective(S_T) dS_T`}</Formula>
        <p>
          A stock can be a buy even when consensus <em>is</em> the modal scenario, if dispersion or a
          low-probability / large-payoff tail dominates. Edge is where the subjective density
          diverges from the options-implied density for a given outcome; we price each candidate
          structure&apos;s expected payoff under the subjective density (discounted by e^(−rT))
          against its market cost. A positive gap is the candidate mispricing.
        </p>
      </Section>

      <Section id="q-vs-p" title="Risk-neutral (Q) vs real-world (P), the non-negotiable caveat">
        <p>
          <Badge variant="warn">Read this one</Badge>
        </p>
        <p>
          The options-implied density is <strong>risk-neutral (Q)</strong>, not real-world (P). Risk
          aversion inflates down-state probabilities, so the implied distribution is pessimistically
          skewed versus true odds. The persistent gap is the volatility/variance risk premium: implied
          vol exceeds subsequently-realized vol on average.
        </p>
        <Formula>{`VRP ≈ implied vol − realized vol   (e.g. ATM IV − 30-day realized)`}</Formula>
        <p>
          We display the VRP explicitly, label the axis &quot;market-implied (risk-neutral)
          probability,&quot; and offer a transparent risk-premium adjustment (a constant drift tilt)
          rather than pretending to do a full, contested Ross recovery. Mislabeling Q as P is the
          red-flag error naive &quot;implied probability&quot; tools make; we don&apos;t.
        </p>
      </Section>

      <Section id="sizing" title="Sizing (Kelly)">
        <p>The bet closes with fractional Kelly:</p>
        <Formula>{`Discrete:    f* = (b·p − q) / b      (b = payoff odds, p = win prob, q = 1−p)
Continuous:  f* = (μ − r) / σ²`}</Formula>
        <p>
          We always present <strong>half</strong>-Kelly. Full Kelly is optimal only if your
          probabilities are exactly right, which they never are; halving absorbs estimation error and
          signals you understand parameter risk. f* &lt; 0 means negative EV, don&apos;t bet.
        </p>
      </Section>

      <Section id="ai" title="The AI analyst">
        <p>
          Production LLMs are RLHF-overconfident and do not natively emit calibrated probabilities. So
          we never surface a bare model probability. The model is handed the options-implied
          (risk-neutral) probabilities as a base rate and must anchor to them, justify any deviation
          with specific evidence, and return its own overconfidence caveat. The output feeds the same
          EV engine as a manual view, it doesn&apos;t get a special pass.
        </p>
      </Section>

      <Section id="calibration" title="Calibration">
        <p>
          We score the analyst&apos;s own probabilistic calls with a Brier score (mean squared error
          of probability vs outcome; 0 is perfect, 0.25 is a coin flip answered &quot;50%&quot;) and a
          reliability diagram (when you say X%, does it happen X% of the time?). This grades decision
          quality independent of any single outcome, process over outcome.
        </p>
      </Section>

      <Section id="data" title="Data & honesty">
        <p>
          Option chains, quotes, and history come from a free/best-effort source (yahoo-finance2) with
          SEC EDGAR for filings and fundamentals. The demo runs on baked, internally-consistent
          snapshots so it can&apos;t break live; flip <span className="mono">OSHIN_FORCE_LIVE=1</span>{" "}
          to pull live chains for any ticker, with snapshot fallback on error. Everything is labeled
          delayed / illustrative. Honesty about data provenance is a feature, not a weakness, it
          assumes you already have Bloomberg and proprietary analytics; Oshin adds the one reasoning
          layer those don&apos;t surface.
        </p>
        <p className="text-faint">
          Not investment advice. Illustrative research tooling built as an interview demonstration.
        </p>
      </Section>
    </div>
  );
}
