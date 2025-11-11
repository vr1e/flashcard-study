# Flashcard Study Tool - Documentation

## Overview

This directory contains technical documentation for the Flashcard Study Tool project.

## Documentation Structure

### RFCs (Request for Comments)

The `rfcs/` directory contains technical design documents that describe features, architecture decisions, and implementation approaches.

#### RFC Implementation Status

| RFC                                                  | Title                         | Status         | Complete | Key Notes                                                 |
| ---------------------------------------------------- | ----------------------------- | -------------- | -------- | --------------------------------------------------------- |
| [0001](rfcs/0001-spaced-repetition-algorithm.md)     | Spaced Repetition Algorithm   | ✅ Implemented | 100%     | SM-2 algorithm fully working, all card fields present     |
| [0002](rfcs/0002-study-session-flow.md)              | Study Session Flow            | ✅ Implemented | 100%     | Interactive sessions + bonus features (timer, auto-start) |
| [0003](rfcs/0003-api-design.md)                      | API Design                    | ✅ Implemented | 100%     | All 16 endpoints operational, consistent JSON structure   |
| [0004](rfcs/0004-testing-strategy.md)                | Testing Strategy              | 📝 Draft       | 0%       | **CRITICAL GAP**: No pytest tests, manual testing only    |
| [0005](rfcs/0005-production-deployment.md)           | Production Deployment         | ✅ Implemented | 100%     | Deployed to PythonAnywhere, all security fixes applied    |
| [0006](rfcs/0006-automated-deployment.md)            | Automated Deployment          | ✅ Implemented | 90%      | GitHub Actions CI/CD, manual migrations required          |
| [0007](rfcs/0007-partnership-shared-decks.md)        | Partnership/Shared Decks      | ✅ Implemented | 100%     | Full partnership system with UI (PR #3)                   |
| [0008](rfcs/0008-bidirectional-language-learning.md) | Bidirectional Learning        | ✅ Implemented | 100%     | Language fields, direction selection, per-user progress   |
| [0009](rfcs/0009-course-collection-terminology.md)   | Course/Collection Terminology | ✅ Implemented | 100%     | Progressive disclosure, activity feed, stats filtering    |
| [0010](rfcs/0010-shared-deck-permission-bugs.md)     | Permission & Security Bugs    | ✅ Implemented | 100%     | 7 bugs fixed: permissions, CSP, error messages            |
| [0011](rfcs/0011-onboarding-partnership-discoverability.md) | First-Time User Onboarding | ✅ Implemented | 100%     | Enhanced empty state, navigation simplification, UserProfile model |

**Legend**: ✅ Implemented | 🚧 Partial | 📝 Draft | 🔮 Planned

---

### Implementation Summary

#### ✅ Production-Ready Core (100% Complete)

- **Single-user flashcard system** with SM-2 spaced repetition
- Full CRUD for decks and cards
- Interactive study sessions with quality tracking
- Statistics dashboard with visualizations
- User authentication and authorization
- Production deployment with automated CI/CD

#### ✅ Partnership Features (100% Complete)

- **RFC 0007**: Partnership system with invitation codes, shared decks, permission management
- **RFC 0008**: Bidirectional language learning with per-user, per-direction progress tracking
  - Language-aware cards (language_a/language_b with codes)
  - Study direction selection (A→B, B→A, Random)
  - UserCardProgress model for separate SM-2 tracking
- **RFC 0009**: Course/Collection terminology with progressive disclosure
  - Dual-mode dashboard (single-mode before partnership, dual-mode after)
  - Welcome page for first-time users
  - Activity feed system
  - Stats filtering (all/courses/collections)
- **RFC 0010**: Permission and security bug fixes
  - Fixed deck_stats permissions for partners
  - Fixed global stats to include shared decks
  - Replaced inline onclick handlers (CSP compliance)
  - Improved error messages with specific codes
- **RFC 0011**: First-time user onboarding and partnership discoverability
  - Enhanced empty state dashboard with visual action cards
  - Simplified navigation (removed "Learning Buddy" nav link)
  - Persistent UserProfile model for onboarding state tracking
  - Complete "Buddy" → "Partner" terminology rebrand

#### 🚧 Incomplete Features

- **RFC 0004 (Testing)**: No automated test suite despite RFC documentation
  - Critical gap for production confidence
  - Manual testing and Playwright E2E only

---

### Development Roadmap

#### Current Focus: Testing & Stability

**Goal**: Production confidence and code quality

1. **Implement RFC 0004 (Testing Strategy)** ← Highest Priority

   - Add pytest test suite (~25-30 tests)
   - SM-2 algorithm unit tests
   - API endpoint integration tests
   - Model method tests
   - Partnership and permission tests
   - **Effort**: 2-3 days

2. **Additional Bug Fixes & Enhancements**
   - Add rate limiting to partnership invites
   - Input validation for card text length
   - Performance optimization for large decks
   - **Effort**: 4-6 hours

---

### Quick Status Reference

```
Core Flashcard System:        ███████████████████████████████ 100%
Partnership/Sharing:          ███████████████████████████████ 100%
Bidirectional Learning:       ███████████████████████████████ 100%
UX & Terminology (RFC 0009):  ███████████████████████████████ 100%
Bug Fixes (RFC 0010):         ███████████████████████████████ 100%
Onboarding & UX (RFC 0011):   ███████████████████████████████ 100%
Automated Testing:            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%
```

**Current Status**: Couples language learning platform (fully functional, production-ready UX with enhanced onboarding)
**Next Milestone**: Add comprehensive test coverage (RFC 0004)
**Current Branch**: `rfc-0011-firsttime-user-onboarding-partnership-discoverability` (ready for PR)

#### RFC Process

1. Copy `rfcs/0000-rfc-template.md` to create a new RFC
2. Number sequentially (e.g., 0004, 0005)
3. Fill in all sections
4. Update status as implementation progresses

#### RFC Guidelines

**Purpose**: RFCs document technical decisions, not tutorials

**Length Limit**: Maximum 500 lines (keep focused and concise)

**Structure**:

- Abstract (2-3 sentences summarizing the proposal)
- Context (why this is needed, current state)
- Proposal (what we're building/changing)
- Implementation (how - high level steps)
- Success criteria (what defines done)

**Best Practices**:

- Link to external documentation instead of duplicating content
- Use bullet points and tables over long paragraphs
- Show minimal code examples (illustrative snippets, not complete files)
- Reference other RFCs instead of repeating information
- Focus on decisions and rationale, not exhaustive tutorials

## Quick Links

### Development

- Django Admin: `/admin/`
- API Documentation: See RFC 0003

### Models

- `Deck`: Collection of flashcards
- `Card`: Individual flashcard with SRS data
- `StudySession`: Tracks study sessions
- `Review`: Individual card reviews

### Key Technologies

- **Backend**: Django 4.2+
- **Frontend**: TypeScript, Bootstrap 5
- **Charts**: Chart.js
- **Algorithm**: SM-2 Spaced Repetition
