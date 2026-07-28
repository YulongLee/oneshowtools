# Platform Shell Specification

## Purpose

Define the current observable behavior of the OneShowTools portal prototype,
which provides a shared discovery and management surface for AI tools.

## Requirements

### Requirement: Platform identity

The portal SHALL identify itself as OneShowTools and SHALL communicate that it
is a product under OneShow AI Lab.

#### Scenario: Visitor opens the portal

- **WHEN** a visitor opens the default page
- **THEN** the header SHALL display the OneShowTools product identity
- **AND** the page SHALL display its OneShow AI Lab relationship

### Requirement: Tool discovery

The portal SHALL present the available AI tools with a name, concise
description, recognizable icon, and launch affordance.

#### Scenario: Visitor browses all tools

- **GIVEN** no search query is active
- **WHEN** the visitor views the tool library
- **THEN** the portal SHALL show every currently configured prototype tool
- **AND** each tool SHALL expose a visible selection action

### Requirement: Tool search

The portal SHALL let visitors search the prototype catalog using tool names,
descriptions, and supported need keywords.

#### Scenario: Search matches a tool

- **WHEN** a visitor submits a query that matches a configured tool
- **THEN** the tool library SHALL show only matching tools

#### Scenario: Search has no matches

- **WHEN** a visitor submits a query that matches no configured tool
- **THEN** the portal SHALL show a clear empty state
- **AND** the visitor SHALL be able to return to the complete catalog

#### Scenario: Visitor uses a popular search

- **WHEN** a visitor selects a popular-search shortcut
- **THEN** the portal SHALL run that search without requiring manual text entry

### Requirement: Tool selection feedback

The prototype SHALL acknowledge tool selection without claiming that a
production tool workflow has launched.

#### Scenario: Visitor selects a tool

- **WHEN** a visitor selects a tool from the catalog or recent-usage list
- **THEN** the portal SHALL show visible feedback naming the selected tool
- **AND** the feedback SHALL be dismissible

### Requirement: Account entry point

The prototype SHALL provide a visible login entry point and SHALL explain the
shared-account benefits.

#### Scenario: Visitor opens login

- **WHEN** a visitor selects the login action
- **THEN** the portal SHALL open an accessible login dialog
- **AND** the dialog SHALL mention synchronized history, favorites, or credits
- **AND** the visitor SHALL be able to close the dialog

### Requirement: Shared workspace preview

The prototype SHALL show representative recent activity and quota information
as a preview of shared platform management.

#### Scenario: Visitor views the default page

- **WHEN** the portal finishes rendering
- **THEN** it SHALL show recent tool activity
- **AND** it SHALL show the current prototype credit balance and limit

### Requirement: Responsive portal layout

The portal SHALL remain usable on desktop and small-screen web viewports.

#### Scenario: Visitor uses a narrow viewport

- **WHEN** the available viewport becomes narrow
- **THEN** navigation SHALL remain reachable
- **AND** the recent-usage and tool-library sections SHALL reflow without
  horizontal page overflow
- **AND** search and tool-selection controls SHALL remain operable
