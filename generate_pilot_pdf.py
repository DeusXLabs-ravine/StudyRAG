#!/usr/bin/env python3
"""StudyRAG Pilot Design — plain-text 2-page PDF."""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors

W, H = letter

def doc_styles():
    dark = colors.HexColor("#111111")
    mid  = colors.HexColor("#333333")

    h1 = ParagraphStyle("h1", fontSize=13, fontName="Helvetica-Bold",
        textColor=dark, leading=17, spaceAfter=4, spaceBefore=10)
    h2 = ParagraphStyle("h2", fontSize=10, fontName="Helvetica-Bold",
        textColor=dark, leading=13, spaceAfter=3, spaceBefore=7)
    body = ParagraphStyle("body", fontSize=9.5, fontName="Helvetica",
        textColor=mid, leading=13.5, spaceAfter=4, alignment=TA_JUSTIFY)
    blt = ParagraphStyle("blt", parent=body,
        leftIndent=14, firstLineIndent=0, spaceAfter=3)
    rule_style = ParagraphStyle("rule", fontSize=1, leading=1,
        spaceAfter=6, spaceBefore=0)
    return h1, h2, body, blt, rule_style


def rule(w):
    from reportlab.platypus import HRFlowable
    return HRFlowable(width=w, thickness=0.6,
                      color=colors.HexColor("#AAAAAA"), spaceAfter=4, spaceBefore=2)


def build(out):
    doc = SimpleDocTemplate(out, pagesize=letter,
        leftMargin=0.85*inch, rightMargin=0.85*inch,
        topMargin=0.75*inch, bottomMargin=0.75*inch)

    PW = W - 1.70*inch
    h1, h2, body, blt, _ = doc_styles()

    def H1(t): return Paragraph(t, h1)
    def H2(t): return Paragraph(t, h2)
    def P(t):  return Paragraph(t, body)
    def B(t):  return Paragraph(f"&#8226;&#160;&#160;{t}", blt)
    def SP(n=4): return Spacer(1, n)

    story = []

    # ── TITLE ─────────────────────────────────────────────────────────────────
    story.append(Paragraph(
        "STUDYRAG — PILOT DEPLOYMENT PLAN",
        ParagraphStyle("cover", fontSize=16, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#0D1B3E"), leading=20,
            spaceAfter=2, alignment=TA_LEFT)
    ))
    story.append(Paragraph(
        "Offline-Capable, Voice-Driven AI Teaching at Scale  |  1,000+ Users  |  20-Week Academic Pilot",
        ParagraphStyle("sub", fontSize=9, fontName="Helvetica",
            textColor=colors.HexColor("#555555"), leading=12, spaceAfter=6)
    ))
    story.append(rule(PW))

    # ── 1. PRIMARY OBJECTIVES ─────────────────────────────────────────────────
    story.append(H1("1. Primary Objectives and Structure of the Pilot"))
    story.append(P(
        "The central question this pilot is designed to answer is a practical one: can a "
        "voice-driven, offline-capable AI tutoring platform produce meaningful gains in "
        "comprehension, engagement, and long-term retention for students who are routinely "
        "excluded from modern educational technology — not because they lack motivation or "
        "ability, but because they lack a reliable internet connection or because existing "
        "tools were not designed with their cognitive or physical needs in mind?"
    ))
    story.append(P(
        "StudyRAG's architecture treats low-bandwidth environments as a first-class "
        "constraint rather than an afterthought. Lesson content is pre-cached locally, "
        "AI tutoring sessions run entirely on-device, and progress syncs silently during "
        "brief connectivity windows without interrupting the student's workflow. The pilot "
        "exists to stress-test this architecture at scale — 1,000 active users across "
        "diverse contexts — and to generate the kind of longitudinal evidence that "
        "institutional partners and funders need before committing to permanent adoption."
    ))
    story.append(H2("Four-Phase Structure"))
    story.append(B(
        "<b>Phase 1 — Preparation and Onboarding (Weeks 1–4):</b> During this phase we "
        "finalize institutional agreements, build and quality-check the localized "
        "curriculum cache for each deployment region, and run train-the-trainer workshops "
        "with educators and NGO field staff. The goal is that by Day 1 of deployment, "
        "every supporting adult has already used the platform themselves and can answer "
        "a student's first-hour questions without escalating to our team."
    ))
    story.append(B(
        "<b>Phase 2 — Deployment and Initial Use (Weeks 5–8):</b> The application is "
        "distributed to the full cohort of 1,200 enrolled students. Usage telemetry — "
        "session length, concept completion rates, voice-query frequency, and offline "
        "vs. online session ratios — is collected continuously and auto-synced to our "
        "analytics backend whenever a device connects. No student action is required "
        "for data to upload."
    ))
    story.append(B(
        "<b>Phase 3 — Active Monitoring and Iteration (Weeks 9–16):</b> This is the "
        "longest and most operationally intensive phase. We conduct bi-weekly reviews "
        "of aggregated usage data, push Over-the-Air (OTA) content updates and UI "
        "refinements through high-speed sync nodes, and run short accessibility sprints "
        "responding to feedback from students with disabilities. Mid-pilot surveys are "
        "distributed at Week 10 and Week 14 to capture qualitative experience data "
        "alongside the quantitative telemetry."
    ))
    story.append(B(
        "<b>Phase 4 — Evaluation and Reporting (Weeks 17–20):</b> The final phase "
        "centers on summative learning assessments benchmarked against each institution's "
        "existing academic standards, a comprehensive user satisfaction survey, and "
        "structured debrief sessions with all partner organizations. A full impact "
        "report — including disaggregated outcomes by user segment — is delivered to "
        "all stakeholders within 30 days of the pilot's close."
    ))
    story.append(SP(6))

    # ── 2. DURATION ───────────────────────────────────────────────────────────
    story.append(H1("2. Duration of the Pilot"))
    story.append(P(
        "The pilot runs for <b>20 weeks (five calendar months)</b>, deliberately aligned "
        "with a standard academic semester so that participation can be integrated into "
        "students' existing coursework rather than added on top of it. A 20-week window "
        "is long enough to observe whether initial engagement persists or declines after "
        "the novelty period — typically Weeks 3 through 6 — and long enough to capture "
        "meaningful learning-outcome data from the summative assessments administered in "
        "the final phase. Pilots shorter than 12 weeks routinely overstate engagement "
        "metrics because they end before habit decay sets in; this design explicitly "
        "accounts for that risk."
    ))
    story.append(SP(6))

    # ── 3. USER GROUPS ────────────────────────────────────────────────────────
    story.append(H1("3. Participating User Groups"))
    story.append(P(
        "We are enrolling <b>1,200 students</b> in total, building in a 20% buffer to "
        "ensure that the active user base remains at or above 1,000 throughout the pilot "
        "even after anticipated attrition from course drops, device failures, or "
        "relocation. The cohort is divided into three segments, each chosen to generate "
        "distinct and complementary evidence."
    ))
    story.append(H2("Low-Resource and Marginalized Students (60% — approx. 720 students)"))
    story.append(P(
        "This segment is the primary beneficiary group and the core reason StudyRAG "
        "exists. Students are drawn from low-income rural and peri-urban households "
        "where internet access is intermittent, prohibitively expensive, or both. Many "
        "of these students have previously been excluded from AI-assisted learning tools "
        "not because those tools wouldn't help them, but because those tools require a "
        "stable broadband connection to function at all. StudyRAG's offline-first "
        "architecture removes that dependency entirely. Recruitment for this segment "
        "happens primarily through our NGO partners who already operate in these "
        "communities and have earned the trust required to make participation feel "
        "safe rather than extractive."
    ))
    story.append(H2("Students with Learning Disabilities (20% — approx. 240 students)"))
    story.append(P(
        "This segment focuses specifically on students with Dyslexia and ADHD, two "
        "conditions that are frequently underserved by text-heavy educational interfaces. "
        "StudyRAG's voice-first interaction model, adjustable pacing, short-form concept "
        "chunking, and WCAG 2.1 AA-compliant UI are designed to minimize cognitive and "
        "reading load. Participants in this segment are identified through partnerships "
        "with university and school-district Disability Services offices, who also "
        "co-design the accessibility-specific feedback instruments used during Phases 3 "
        "and 4. Outcomes for this segment are tracked separately, with particular "
        "attention to session completion rates, average session length, and self-reported "
        "comprehension confidence."
    ))
    story.append(H2("General Cohort — Control Baseline (20% — approx. 240 students)"))
    story.append(P(
        "This segment is drawn from standard-resource environments — students with "
        "reliable connectivity and no documented learning disabilities — and serves as "
        "a comparative baseline. Including this group allows us to determine whether "
        "StudyRAG's engagement and outcome improvements are specific to the populations "
        "it was designed for, or whether they generalize more broadly. It also helps "
        "institutional partners contextualize results against their existing student "
        "population averages."
    ))
    story.append(SP(6))

    # ── 4. PARTNERSHIPS ───────────────────────────────────────────────────────
    story.append(H1("4. Potential Partnerships"))
    story.append(P(
        "No single organization has the distribution reach, community trust, "
        "technical infrastructure, and accessibility expertise required to run this "
        "pilot well. Our partnership model deliberately combines four complementary "
        "actor types:"
    ))
    story.append(B(
        "<b>Universities and School Districts (Public/System-Level):</b> Institutional "
        "partners provide the formal channels through which software is distributed to "
        "students, integrate pilot participation into existing course credit or "
        "extracurricular structures, share anonymized academic performance baselines "
        "against which we can measure learning gains, and give the pilot the "
        "institutional legitimacy that standalone app deployments lack. Target partners "
        "include at least two regional universities and one school district with an "
        "established rural or peri-urban student population."
    ))
    story.append(B(
        "<b>Educational Equity NGOs:</b> Ground-level NGO partners handle recruitment "
        "and onboarding for the low-resource segment, where institutional channels alone "
        "are insufficient. They conduct localized onboarding workshops in the communities' "
        "primary languages, distribute devices where students lack access to their own "
        "hardware, and serve as the primary qualitative feedback channel — gathering "
        "observations, anecdotes, and concerns that usage dashboards are structurally "
        "unable to surface."
    ))
    story.append(B(
        "<b>Telecommunication Providers:</b> We are in active exploratory conversations "
        "with regional telecom operators about zero-rating arrangements that would "
        "exempt StudyRAG's sync and cache-download traffic from data charges for "
        "students on low-income mobile plans. Even a partial zero-rating agreement "
        "substantially lowers the barrier to connectivity for the low-resource segment "
        "and strengthens the case for long-term scalability."
    ))
    story.append(B(
        "<b>University Accessibility and Disability Services Offices:</b> These offices "
        "bring specialized expertise in assistive technology, neurodivergent learning "
        "patterns, and ethical research design with disabled participants. They "
        "co-design the feedback rubrics for the disability segment, help ensure that "
        "recruitment processes are genuinely voluntary and non-coercive, and flag "
        "any UI regressions introduced through OTA updates that might disproportionately "
        "affect screen-reader or switch-access users."
    ))
    story.append(SP(6))

    # ── 5. RESPONSIBILITIES ───────────────────────────────────────────────────
    story.append(H1("5. Responsibilities of Each Partner"))
    story.append(H2("StudyRAG (Core Team)"))
    story.append(P(
        "We are responsible for the software itself — including a 99.9% uptime SLA for "
        "all server-side components, end-to-end encryption of student data, compliance "
        "with applicable data privacy regulations (FERPA, GDPR as applicable), and the "
        "delivery of aggregated, anonymized analytics reports to institutional partners "
        "on a bi-weekly basis. We also lead all UX iteration sprints, manage the OTA "
        "update pipeline, and provide a dedicated technical support channel with a "
        "guaranteed 24-hour response time for critical issues."
    ))
    story.append(H2("Educational Institutions"))
    story.append(P(
        "Partner institutions are responsible for formally integrating pilot participation "
        "into their student engagement structures — through course credit, extra credit, "
        "or official extracurricular recognition — to ensure that participation is "
        "incentivized appropriately. They are also responsible for providing anonymized "
        "academic performance baseline data (prior-semester grades, standardized test "
        "scores where available) that allows us to control for pre-existing differences "
        "between user segments when analyzing outcomes."
    ))
    story.append(H2("NGO Partners"))
    story.append(P(
        "NGO partners serve as the human infrastructure of the low-resource segment. "
        "They are responsible for community recruitment, culturally appropriate "
        "onboarding, device distribution logistics, and ongoing qualitative data "
        "collection through structured field observations and informal interviews. "
        "They are not responsible for technical troubleshooting, but they receive "
        "training to diagnose and escalate the most common device and software issues "
        "without requiring a student to contact our team directly."
    ))
    story.append(H2("Accessibility and Disability Services Offices"))
    story.append(P(
        "These offices take shared ownership of the research instruments used with the "
        "disability segment. They review and approve all surveys and interview guides "
        "before deployment, participate in the mid-pilot data interpretation sessions, "
        "and produce a separate accessibility findings memo as part of the Phase 4 "
        "reporting package. Their involvement ensures that findings from this segment "
        "are interpreted through an appropriate lens rather than treated as a simple "
        "subset of the general results."
    ))
    story.append(SP(6))

    # ── 6. LONG-TERM OUTCOMES ─────────────────────────────────────────────────
    story.append(H1("6. Long-Term Outcomes and Persistence Pathways"))
    story.append(P(
        "This pilot is not a one-time intervention. It is designed from the first week "
        "to build infrastructure, relationships, and institutional habits that outlast "
        "the 20-week window."
    ))
    story.append(B(
        "<b>LMS Integration:</b> The most significant long-term outcome target is direct "
        "integration of StudyRAG's AI tutoring layer into the Learning Management Systems "
        "already in use by institutional partners — Moodle, Canvas, or Blackboard "
        "depending on the institution. Rather than requiring students to switch between "
        "platforms, the goal is that by Month 6 post-pilot, StudyRAG's voice tutoring "
        "and adaptive quiz features appear natively within the LMS environment students "
        "already use daily. This removes the adoption friction that kills most "
        "third-party educational tools after a pilot ends."
    ))
    story.append(B(
        "<b>Data-Driven Curriculum Support:</b> Throughout the pilot, the analytics "
        "engine logs which concepts trigger the most repeated queries, where students "
        "disengage mid-session, and which voice explanations most reliably produce "
        "correct responses on follow-up questions. This data is returned to institutional "
        "partners in an actionable format — not as raw logs but as ranked lists of "
        "curriculum gaps with suggested remediation strategies. The intent is that "
        "this feedback loop becomes a standing component of each institution's annual "
        "curriculum review process, independent of whether StudyRAG remains in use."
    ))
    story.append(B(
        "<b>Sustained Offline Access Infrastructure:</b> The low-bandwidth caching "
        "and sync architecture built for this pilot is not proprietary in a way that "
        "locks institutions to StudyRAG. We commit to publishing the technical "
        "specifications for the sync protocol under an open license post-pilot, "
        "allowing partner institutions and other developers to apply the same "
        "offline-first model to other educational tools. This establishes a durable "
        "infrastructure precedent rather than a one-time deployment."
    ))
    story.append(B(
        "<b>Policy and Advocacy Pathway:</b> The disaggregated outcome data generated "
        "by this pilot — particularly for the low-resource and disability segments — "
        "is intended to feed directly into policy conversations at the regional "
        "education authority level about what accessibility and connectivity standards "
        "should be required of publicly funded EdTech tools. NGO partners and "
        "Disability Services offices will co-author a public policy brief drawing "
        "on pilot findings, delivered no later than 60 days after the pilot closes."
    ))
    story.append(SP(8))
    story.append(Paragraph(
        "StudyRAG Pilot Design  ·  Confidential — April 2026  ·  studyrag.io",
        ParagraphStyle("ft", fontSize=7.5, textColor=colors.HexColor("#888888"),
            fontName="Helvetica", leading=10,
            alignment=1)   # CENTER
    ))

    doc.build(story)
    print(f"✅  PDF saved → {out}")


if __name__ == "__main__":
    OUT = os.path.join(
        r"C:\Users\USER\Documents\GitHub\StudyRAG\.claude\worktrees\inspiring-grothendieck",
        "StudyRAG_Pilot_Design.pdf"
    )
    build(OUT)
