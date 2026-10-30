import React from 'react';
export function Heading({eyebrow,title,description}: {eyebrow: string; title: string; description: string}) {
 return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></div>;
}
