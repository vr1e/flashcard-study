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
| [0009](rfcs/0009-data-migration-strategy.md)         | Data Migration Strategy       | ⏭️ Superseded  | N/A      | Not needed - direct implementation used instead           |
| [0010](rfcs/0010-course-collection-terminology.md)   | Course/Collection Terminology | 🔮 Planned     | 0%       | UX vision, depends on RFC 0007 completion                 |

**Legend**: ✅ Implemented | 🚧 Partial | 📝 Draft | 🔮 Planned | ⏭️ Superseded

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

#### 🚧 Incomplete Features

- **RFC 0004 (Testing)**: No automated test suite despite RFC documentation
  - Critical gap for production confidence
  - Manual testing and Playwright E2E only

#### 🔮 Future Features (Not Started)

- **RFC 0010**: UI/UX terminology changes for partnership features

---

### Development Roadmap

#### Phase 1: Stability & Testing (Recommended Next Steps)

**Goal**: Production confidence and code quality

1. **Implement RFC 0004 (Testing Strategy)**

   - Add pytest test suite (~25-30 tests)
   - SM-2 algorithm unit tests
   - API endpoint integration tests
   - Model method tests
   - **Effort**: 2-3 days

2. **Bug Fixes**
   - Fix shared deck permissions in card listing
   - Add rate limiting to partnership invites
   - Input validation for card text length
   - **Effort**: 4-6 hours

#### Phase 2: UX Polish (RFC 0010)

**Goal**: Complete couples learning platform UX

1. **RFC 0010**: UX improvements
   - Terminology changes ("Decks" → "Courses/Collections")
   - Color-coded shared vs personal decks
   - Progressive disclosure of partnership features
   - **Effort**: 1-2 days

---

### Quick Status Reference

```
Core Flashcard System:        ███████████████████████████████ 100%
Partnership/Sharing:          ███████████████████████████████ 100%
Bidirectional Learning:       ███████████████████████████████ 100%
Automated Testing:            ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%
```

**Current Status**: Couples language learning platform (fully functional)
**Next Milestone**: Add test coverage (RFC 0004)
**Future Enhancements**: Data migration (RFC 0009), UX polish (RFC 0010)

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
