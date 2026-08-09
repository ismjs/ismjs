# Reference material

This directory contains pinned public source material used to generate vocabularies,
harvest conformance vectors, and verify rendering behavior. It is build-time and test-time
authority material; it is not included in the published npm package.

## ODNI technical specifications

The vendored specification packages came from the Office of the Director of National
Intelligence's archived [IC Technical Specifications catalog](https://archive.dni.gov/index.php/what-we-do/ic-technical-specs).
That catalog identifies the enterprise data specifications as products of Intelligence
Community collaboration and lists Information Security Marking Metadata and Rollup
Guidance for ISM among its data encoding specifications.

The pinned directory names retain the release and package names published by ODNI:

- `ISM-Public-Convenience-2022-DEC-Public-Light/`
- `ISM-Rollup-Public-Convenience-2022-DEC-Public-Light/`

Only the source files required by code generation and corpus harvesting, together with
the XSL and Schematron cited as normative evidence, are committed. The ignore policy in
the repository's `.gitignore` records the excluded duplicate encodings and human-facing
package material.

## Additional public guidance

- `520001m_vol2.pdf` is DoDM 5200.01, Volume 2, _DoD Information Security Program:
  Marking of Information_. The document states that it is cleared for public release.
- `Cleared-CUI-Training-Aid-Markings-2024.pdf` is the December 2024 DoD CUI marking
  training aid, cleared for open publication as DOPSR 25-P-0275.

## Rights and attribution

The repository's MIT license applies to ismjs, not to the material in this directory.
The reference files retain their original public-release status and any terms stated by
their issuing agencies. They are vendored here as authoritative inputs and evidence, not
relicensed by this project.
