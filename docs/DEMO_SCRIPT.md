# BoundaryAI Demo Script

**Duration:** 5 minutes
**Audience:** Hackathon Judges
**Goal:** Demonstrate AI-powered land parcel boundary detection with ROR validation

---

## Demo Flow

### 1. INTRODUCTION (30 seconds)

**Show:** Logo and tagline on dashboard

**Say:**
> "BoundaryAI - Intelligent land parcel extraction for Andhra Pradesh's Re-Survey project.
>
> We're tackling one of India's largest land administration challenges: surveying 2 crore land parcels. Traditional manual surveying is slow, expensive, and error-prone.
>
> Our solution uses AI to detect boundaries from drone imagery and validates them against existing land records - the ROR."

---

### 2. THE PROBLEM (30 seconds)

**Show:** Sample ORI drone image with complex boundaries

**Say:**
> "Here's a typical drone image from a village in AP. You can see hundreds of land parcels with boundaries formed by bunds - those raised earth ridges.
>
> A surveyor would need to manually trace each parcel. For this village alone, that's over 1,000 parcels. Multiply by 17,000 villages, and you understand the scale of the problem.
>
> The question is: can AI help?"

---

### 3. OUR INNOVATION (1 minute)

**Show:** Architecture diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Drone Image    │────►│  SAM + ROR       │────►│  Validated      │
│                 │     │  Constraints     │     │  Parcels        │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐                                       ▼
│  ROR Records    │─────────────────────────────►  CONFIDENCE
│  (Land Records) │                                SCORING
└─────────────────┘                                       │
                                                          ▼
                                            ┌─────────────────────────┐
                                            │ AUTO   │ DESKTOP │ FIELD │
                                            │ 85%    │ 60-85%  │ <60%  │
                                            └─────────────────────────┘
```

**Say:**
> "We don't just detect boundaries - we VALIDATE them.
>
> Our innovation is ROR-Constrained Segmentation. Here's how it works:
>
> 1. **SAM** - Meta's Segment Anything Model - detects potential parcel boundaries from the drone image
>
> 2. **ROR Constraints** - We use the existing Record of Rights to guide and validate:
>    - Expected number of parcels
>    - Expected area for each parcel
>    - We use Hungarian algorithm for optimal matching
>
> 3. **Confidence Scoring** - Each parcel gets a confidence score based on:
>    - Area match with ROR
>    - Boundary clarity in image
>    - Shape regularity
>
> 4. **Smart Routing** - Based on confidence, we route parcels to:
>    - AUTO-APPROVE (≥85%): No human review needed
>    - DESKTOP REVIEW (60-85%): Quick visual check
>    - FIELD VERIFICATION (<60%): Surveyor must visit
>
> This is the key: we're not replacing surveyors, we're making them 10x more efficient by letting AI handle the easy cases."

---

### 4. LIVE DEMO (2 minutes)

**Action:** Open dashboard at http://localhost:8501

#### 4a. Load Village (15 sec)

**Say:**
> "Let me show you a real village - Kanumuru in Krishna district."

**Action:** Select "Kanumuru" from dropdown

#### 4b. Show Map (30 sec)

**Say:**
> "Here's our map view. Each parcel is color-coded by confidence:
> - Green: High confidence - can be auto-approved
> - Yellow: Medium - needs quick desktop review
> - Red: Low - surveyor should verify
>
> You can see most parcels are green - that's our target."

**Action:** Zoom in to show parcel boundaries

#### 4c. Parcel Detail (30 sec)

**Say:**
> "Let me click on a parcel to show the detail panel."

**Action:** Click on a parcel

**Say:**
> "Here you see:
> - The detected area vs the ROR area - only 2% difference
> - The confidence breakdown showing each factor
> - The overall confidence score of 91%
> - Status: AUTO-APPROVE
>
> This parcel needs zero human intervention."

#### 4d. Statistics (30 sec)

**Say:**
> "Let's look at the statistics panel."

**Action:** Click "Statistics" tab

**Say:**
> "For this village:
> - 1,125 parcels detected
> - 87% average confidence
> - 85% can be auto-approved
> - Only 15% need any human review
>
> Look at the area comparison chart - most points fall on the diagonal line, meaning our detected areas match ROR closely."

#### 4e. Efficiency Gain (15 sec)

**Say:**
> "Most importantly - look at this efficiency metric:
> - 85% reduction in manual work
> - That's hundreds of surveyor-hours saved for just ONE village
> - Scale this to 17,000 villages and the impact is transformational."

---

### 5. RESULTS SUMMARY (30 seconds)

**Show:** Summary metrics

| Metric | Value |
|--------|-------|
| Average Confidence | 87% |
| Auto-Approve Rate | 85.6% |
| Area Match (within 5%) | 98.9% |
| ROR Match Rate | 100% |

**Say:**
> "Our results speak for themselves:
> - 87% average confidence
> - 85% of parcels need zero human review
> - 99% of detected areas match ROR within 5%
>
> This is production-ready accuracy."

---

### 6. DIFFERENTIATORS (30 seconds)

**Say:**
> "What makes BoundaryAI different?
>
> 1. **ROR-Constrained AI** - We don't just detect, we validate against legal records
>
> 2. **Explainable Decisions** - Every confidence score is broken down into factors. No black box.
>
> 3. **Smart Human-AI Collaboration** - We prioritize human effort where it matters most
>
> 4. **Iterative Refinement** - Our feedback loop uses ROR to improve detection accuracy
>
> Thank you. We're happy to answer questions."

---

## Key Demo Points to Hit

1. ✅ Show the MAP with color-coded parcels
2. ✅ Click on a parcel and show CONFIDENCE BREAKDOWN
3. ✅ Show AREA COMPARISON chart
4. ✅ Highlight AUTO-APPROVE percentage
5. ✅ Mention EFFICIENCY GAIN

## Backup Talking Points

**If asked "How is this different from just using SAM?"**
> "SAM segments everything blindly - trees, shadows, buildings. We constrain it with ROR data, so it focuses on actual land parcels and validates areas."

**If asked "What about edge cases?"**
> "That's exactly why we have confidence scoring. Low-confidence parcels go to human reviewers. We're not trying to replace humans, just handle the easy 85%."

**If asked "How long does it take to process a village?"**
> "On a standard laptop, about 30 minutes per village including all validation. That's for 1000+ parcels."

**If asked "What if ROR data is wrong?"**
> "Our system flags mismatches. If we detect 1000 parcels but ROR says 900, that's flagged as a conflict for human review."
