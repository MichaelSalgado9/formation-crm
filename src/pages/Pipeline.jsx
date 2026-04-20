update clients set client_executive = 'James Rambo'    where client_executive = 'James';
update clients set client_executive = 'Michael Salgado' where client_executive = 'Michael';
update clients set client_executive = 'James Rambo'    where client_executive ilike '%james%' and client_executive != 'James Rambo';
update clients set client_executive = 'Michael Salgado' where client_executive ilike '%michael%' and client_executive != 'Michael Salgado';
