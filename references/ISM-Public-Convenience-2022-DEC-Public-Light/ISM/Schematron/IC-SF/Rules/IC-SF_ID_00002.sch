<?xml version="1.0" encoding="utf-8"?>
<?ICEA pattern?>
<!-- Notices - Distribution Notice: 
           This document has been approved for Public Release and is available for use without restriction.
       -->
<sch:pattern xmlns:ism="urn:us:gov:ic:ism" xmlns:sch="http://purl.oclc.org/dsdl/schematron" id="IC-SF-ID-00002">
    <sch:p class="ruleText" ism:ownerProducer="USA" ism:classification="U">
        [IC-SF-ID-00002][Error] The number of sfhashv:BlockHash is equal to the number in @sfhashv:totalBlocks.
    </sch:p>
    <sch:p class="codeDesc" ism:ownerProducer="USA" ism:classification="U">
        This rule ensures that the number of sfhashv:BlockHash is equal to the number in @sfhashv:totalBlocks.
    </sch:p>
    <sch:rule id="IC-SF-ID-00002-R1" context="sfhashv:HashVerification | sfhashv:ContentEncodedHashVerification | sfhashv:ContentDecodedHashVerification">
        <sch:assert test="if (exists(sfhashv:TotalHash) and exists(sfhashv:BlockHash)) then count(sfhashv:BlockHash) = sfhashv:TotalHash/@sfhashv:totalBlocks else true()"
            flag="error" role="error">
            [IC-SF-ID-00002][Error] The number of sfhashv:BlockHash (<sch:value-of select="count(sfhashv:BlockHash)"/>)
            must equal the number in sfhashv:TotalHash/@sfhashv:totalBlocks (<sch:value-of select="sfhashv:TotalHash/@sfhashv:totalBlocks"/>).</sch:assert>
    </sch:rule>
</sch:pattern>
