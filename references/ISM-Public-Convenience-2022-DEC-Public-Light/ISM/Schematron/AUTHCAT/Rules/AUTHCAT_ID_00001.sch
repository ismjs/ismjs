<?xml version="1.0" encoding="UTF-8"?><?ICEA pattern?><!-- Notices - Distribution Notice: 
           This document has been approved for Public Release and is available for use without restriction.
       -->
<sch:pattern xmlns:sch="http://purl.oclc.org/dsdl/schematron" id="AUTHCAT-ID-00001">
    <sch:p class="ruleText">
        [AUTHCAT-ID-00001][Warning] ac:CESVersion attribute SHOULD be specified as version 201804 with an optional extension.
    </sch:p>
    <sch:p class="codeDesc">
        This rule supports extending the version identifier with an optional trailing hyphen
        and up to 23 additional characters. The version must match the regular expression
        “^201804(-.{1,23})?$".
    </sch:p>
    <sch:rule id="AUTHCAT-ID-00001-R1" context="*[@ac:CESVersion]">
        <sch:assert test="matches(@ac:CESVersion,'^201804(\-.{1,23})?$')" flag="warning" role="warning">
            [AUTHCAT-ID-00001][Warning] ac:CESVersion attribute SHOULD be specified as version 201804 with an optional extension.
        </sch:assert>
    </sch:rule>
</sch:pattern>