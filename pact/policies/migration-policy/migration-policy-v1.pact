(namespace (read-msg 'ns))

(module migration_v1 GOVERNANCE

  @doc "Helper contract to migrate marmalade v1 tokens to v2"
  (implements kip.token-policy-v2)

  (use kip.token-policy-v2 [token-info])

  (defcap GOVERNANCE ()
    (enforce-guard (keyset-ref-guard 'marmalade-admin )))

  (defschema migration
    token-id-v1:string
    token-id-v2:string
    amount:decimal
  )

  ;;key by token-id-v1
  (defschema token-id-v2
    token-id-v2:string
  )

  (deftable migrations:{migration})
  (deftable token-ids:{token-id-v2})

  (defcap V1_MIGRATE_TOKEN (token-id-v1:string token-id-v2:string)
    @event
    true
  )

  (defcap V1_MIGRATION_MINT (token-id-v1:string token-id-v2:string amount:decimal)
    @event
    true
  )

  (defun enforce-ledger:bool ()
     (enforce-guard (marmalade.ledger.ledger-guard))
  )

  (defun enforce-init:bool
    ( token:object{token-info}
    )
    @doc "Add previous token-id and ledger for migration"
    (enforce-ledger)
    (let ( (token-id-v1:string (read-msg 'token-id-v1 )) )
      ;; specify v1's ledger
      (marmalade.ledger.total-supply token-id-v1)
      (insert (at 'id token) {
        "token-id-v1": token-id-v1
       ,"token-id-v2": (at 'id token)
       ,"amount": 0.0
      })
      (insert token-ids token-id-v1 {
        "token-id-v2": (at 'id token)
      })
      (emit-event (V1_MIGRATE_TOKEN token-id-v1 (at 'id token))))
  )

  (defun enforce-mint:bool
    ( token:object{token-info}
      account:string
      guard:guard
      amount:decimal
    )
    @doc "BURN previous ledger's token by AMOUNT and MINT in marmalade v2 ledger"
    (enforce-ledger)
    (with-read (at 'id token) {
        "token-id-v1":= token-id-v1
       ,"amount":= amount1
      }
      (update (at 'id token) {
        "burn-amount": (+ amount amount1)
        })
      ;; specify v1's ledger
      (marmalade.ledger.burn token-id-v1 account amount)
      (emit-event (V1_MIGRATION_MINT token-id-v1 (at 'id token) amount)))
  )

  (defun enforce-burn:bool
    ( token:object{token-info}
      account:string
      amount:decimal
    )
    (enforce-ledger)
    true)

  (defun enforce-offer:bool
    ( token:object{token-info}
      seller:string
      amount:decimal
      sale-id:string
    )
    (enforce-ledger)
    true)

  (defun enforce-buy:bool
    ( token:object{token-info}
      seller:string
      buyer:string
      buyer-guard:guard
      amount:decimal
      sale-id:string )
    (enforce-ledger)
    true)


  (defun enforce-transfer:bool
    ( token:object{token-info}
      sender:string
      guard:guard
      receiver:string
      amount:decimal )
    (enforce-ledger)
    true)


  (defun enforce-withdraw:bool
    ( token:object{token-info}
      seller:string
      amount:decimal
      sale-id:string )
    (enforce-ledger)
    true)

  (defun enforce-crosschain:bool
    ( token:object{token-info}
      sender:string
      guard:guard
      receiver:string
      target-chain:string
      amount:decimal )
    (enforce-ledger)
    (enforce false "Transfer prohibited")
  )

  (defun get-migration:object{migration} (token-id-v2:string)
    @doc "Return previous token-id with the new token-id"
    (read migrations token-id-v2)
  )

  (defun get-token-id-v1:string (token-id-v2:string)
    @doc "Return token-id-v1 with token-id-v2"
    (with-read migrations token-id-v2 {
      "token-id-v1":= token-id-v1
      }
      token-id-v1
    )
  )

  (defun get-token-id-v2:string (token-id-v1:string)
    @doc "Return token-id-v2 with token-id-v1"
    (with-read token-ids token-id-v1 {
      "token-id-v2":= token-id-v2
      }
      token-id-v2
    )
  )
)

(if (read-msg 'upgrade)
  ["upgrade complete"]
  [ (create-table migrations)
    (create-table token-ids)
  ])