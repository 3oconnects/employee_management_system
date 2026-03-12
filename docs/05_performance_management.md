# Performance Management System (PMS) - Page Requirements

## Overview

A module for continuous performance monitoring, goal alignment, and annual appraisals.

## UI/UX Flow

- **KRA/Goal Setting**: Interactive list for defining SMART goals.
- **Continuous Feedback**: "Wall of Praise" or social-style feed for peer-to-peer appreciation.
- **Appraisal Wizard**: Step-by-step flow: Self-Appraisal -> Manager Review -> HR Finalization.

## Functional Requirements

### 1. Goal Management

- **Weightage Points**: Assign importance to different KRAs (Totaling 100%).
- **Alignment**: Link individual goals to department and company-wide objectives.
- **Mid-year Check-ins**: Periodic review of progress with status updates (Started, On-track, Delayed).

### 2. Multi-Rater Feedback (360-degree)

- **Peer Review**: Anonymous feedback from colleagues.
- **Down-line Review**: Feedback for managers from their direct reports.
- **Skill Gap Analysis**: Automated spider charts showing core competency vs. current rating.

### 3. Performance Appraisals

- **Rating Scales**: Customizable scales (1-5, A-E, or descriptive like "Exceeds Expectations").
- **Bell Curve Analytics**: Manager-level visualization to ensure fair distribution of ratings.
- **Development Plans (IDP)**: Automated suggestions for training based on performance gaps.

## Logic & Business Rules

- **Freeze Dates**: System-enforced deadlines for goal setting and appraisal submission.
- **Audit Trail**: History of all edits made to appraisal forms during the review process.
- **Normalization**: HR-level overrides to ensure consistency across different departments.

## UX Concepts

- **Spider/Radar Charts**: For visual comparison of skills.
- **Emoji-based Ratings**: For casual, continuous feedback modules.
- **Conflict Resolution UI**: Special view for cases where self-rating and manager-rating differ significantly.
