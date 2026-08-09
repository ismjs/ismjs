<?xml version="1.0" encoding="UTF-8"?>
<?ICEA pattern?>
<!-- Notices - Distribution Notice: 
           This document has been approved for Public Release and is available for use without restriction.
       -->
<sch:pattern xmlns:sch="http://purl.oclc.org/dsdl/schematron" id="ROLE-ID-00001">
    <sch:p class="ruleText">
        [ROLE-ID-00001][Warning] role:CESVersion attribute SHOULD be specified as version 202111 (Version:2021-NOV) with an optional extension.
    </sch:p>
    <sch:p class="codeDesc">
        This rule supports extending the version identifier with an optional trailing hyphen
        and up to 23 additional characters. The version must match the regular expression
        “^202111(-.{1,23})?$".
    </sch:p>
    <sch:rule id="ROLE-ID-00001-R1" context="*[@role:CESVersion]">
        <sch:assert test="matches(@role:CESVersion,'^202111(\-.{1,23})?$')" flag="warning" role="warning">
            [ROLE-ID-00001][Warning] role:CESVersion attribute SHOULD be specified as version 202111 (Version:2021-NOV) with an optional extension. 
            Found :<sch:value-of select="./@role:CESVersion"/>
        </sch:assert>
    </sch:rule>
</sch:pattern>