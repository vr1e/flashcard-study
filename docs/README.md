# Flashcard Study Tool - Documentation

## Overview

This directory contains technical documentation for the Flashcard Study Tool project.

## Documentation Structure

### RFCs (Request for Comments)

The `rfcs/` directory contains technical design documents that describe features, architecture decisions, and implementation approaches.

#### RFCs

- [RFC 0001: Spaced Repetition Algorithm](rfcs/0001-spaced-repetition-algorithm.md) - SM-2 algorithm (✅ Implemented)
- [RFC 0002: Study Session Flow](rfcs/0002-study-session-flow.md) - Interactive study sessions (✅ Implemented)
- [RFC 0003: API Design](rfcs/0003-api-design.md) - RESTful API endpoints (✅ Implemented)
- [RFC 0004: Testing Strategy](rfcs/0004-testing-strategy.md) - Automated testing approach (Draft)
- [RFC 0005: Production Deployment](rfcs/0005-production-deployment.md) - Production fixes & deployment guide (✅ Implemented)

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
