<?xml version="1.0" encoding="UTF-8"?>
<?ICEA pattern?>
<!-- Notices - Distribution Notice: 
           This document has been approved for Public Release and is available for use without restriction.
       -->
<sch:pattern xmlns:sch="http://purl.oclc.org/dsdl/schematron" xmlns:ism="urn:us:gov:ic:ism" id="USAgency-ID-00001">
    <sch:p class="ruleText" ism:classification="U" ism:ownerProducer="USA">
        [USAgency-ID-00001][Warning] usagency:CESVersion attribute SHOULD be specified as version 202207 (Version:2022-JUL) 
        with an optional extension.
    </sch:p>
    <sch:p class="codeDesc" ism:classification="U" ism:ownerProducer="USA">
        This rule supports extending the version identifier with an optional trailing hypen
        and up to 23 additional characters. The version must match the regular expression
        “^202207(\-.{1,23})?$
    </sch:p>
    <sch:rule id="USAgency-ID-00001-R1" context="*[@usagency:CESVersion]">
        <sch:assert test="matches(@usagency:CESVersion,'^202207(\-.{1,23})?$')" flag="warning" role="warning">
            [USAgency-ID-00001][Warning] usagency:CESVersion attribute SHOULD be specified as version 202207 (Version:2022-JUL) 
            with an optional extension.
        </sch:assert>
    </sch:rule>
</sch:pattern>